import { cookies, headers } from 'next/headers';
import { cache } from 'react';
import {
  isPermission,
  isRole,
  type ApiErrorBody,
  type Permission,
  type Role,
} from '@/shared/index';

import { serverFetch, type ApiResult, type ServerFetchOptions } from './api';

/**
 * The server's view of who is signed in.
 *
 * Everything here runs on the server, and the browser only ever supplies a
 * cookie. There is no path through this module that reads a role from a query
 * string, a header the browser chose, or client state: the session is decoded by
 * the API (which owns the signing secret and the session collection) and this
 * module only ever *forwards* the request's own cookie to `GET /api/auth/me`.
 *
 * Two consequences worth stating, because they are decisions:
 *
 *   - There is no "guest user" fallback. A caller whose session cannot be
 *     resolved is `signed-out`, never a substitute identity - a shell that
 *     renders an unauthenticated user as somebody is how a permission gate
 *     quietly becomes decoration.
 *   - An unreachable API is reported as `unavailable`, not as `signed-out`. The
 *     two need different screens: bouncing a signed-in person to the sign-in
 *     page because the API is restarting hides the outage behind a password
 *     prompt that also cannot work.
 */

/**
 * The session cookie's name. It is the API's `SESSION_COOKIE_NAME`
 * (server/src/services/session.ts) and is repeated here because the web
 * workspace cannot import server code; a mismatch shows up immediately as a
 * sign-in that does not survive the redirect.
 */
export const SESSION_COOKIE_NAME = 'cd_session';

export interface SessionProfile {
  fullName: string;
  department: string;
  phone: string;
  bio: string;
  pictureUrl: string | null;
}

/** What `GET /api/auth/me` reports about the caller: the API's `SessionUser` shape. */
export interface SessionUser {
  id: string;
  email: string;
  username: string;
  role: Role;
  /**
   * The effective permission list the navigation filters on. Taken as given once
   * each entry is checked against the shared key set: the Command Centre
   * milestone adds a configurable tick-box matrix, so an account may legitimately
   * hold keys beyond its role's defaults, and re-deriving the list from the role
   * here would silently discard a granted key.
   */
  permissions: readonly Permission[];
  mustChangePassword: boolean;
  profile: SessionProfile;
  lastLoginAt: string | null;
}

export type SessionState =
  | { status: 'authenticated'; user: SessionUser; permissions: readonly Permission[] }
  | { status: 'signed-out' | 'unauthenticated'; user?: undefined; permissions?: undefined }
  /** The API could not be reached or could not answer readably. */
  | { status: 'unavailable'; error: ApiErrorBody; user?: undefined; permissions?: undefined };

function text(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

/**
 * Narrows the API payload to `SessionUser`.
 *
 * Deliberately strict about the two fields a screen trusts: an unknown role or a
 * missing id means the payload is not a session, and returning null sends the
 * caller to the sign-in page rather than rendering a shell around `undefined`.
 */
export function parseSessionUser(payload: unknown): SessionUser | null {
  if (typeof payload !== 'object' || payload === null) return null;

  const candidate = (payload as { user?: unknown }).user;
  if (typeof candidate !== 'object' || candidate === null) return null;

  const record = candidate as Record<string, unknown>;
  if (typeof record.id !== 'string' || record.id.length === 0) return null;
  if (typeof record.email !== 'string') return null;
  if (!isRole(record.role)) return null;

  const profile = (record.profile ?? {}) as Record<string, unknown>;
  const permissions = Array.isArray(record.permissions) ? record.permissions.filter(isPermission) : [];

  return {
    id: record.id,
    email: record.email,
    username: text(record.username),
    role: record.role,
    permissions,
    mustChangePassword: record.mustChangePassword === true,
    profile: {
      fullName: text(profile.fullName),
      department: text(profile.department),
      phone: text(profile.phone),
      bio: text(profile.bio),
      pictureUrl: typeof profile.pictureUrl === 'string' ? profile.pictureUrl : null,
    },
    lastLoginAt: typeof record.lastLoginAt === 'string' ? record.lastLoginAt : null,
  };
}

/**
 * The request's cookie header, verbatim.
 *
 * Forwarded rather than rebuilt from `cookies()`: the session cookie is signed,
 * and a value that has been decoded and re-encoded on the way through is a
 * signature that no longer verifies. `headers()` hands back exactly what the
 * browser sent.
 */
export const incomingCookieHeader = cache((): string => headers().get('cookie') ?? '');

/** True when this request carries a session cookie at all; anything else is a signed-out caller without an API round trip. */
function hasSessionCookie(): boolean {
  return cookies().has(SESSION_COOKIE_NAME);
}

/**
 * One session lookup per render, shared by the layout and the page under it.
 * `cache` is what keeps a page render at one `/api/auth/me` call instead of one
 * per component that asks.
 */
export const getSessionState = cache(async (): Promise<SessionState> => {
  if (!hasSessionCookie()) {
    return { status: 'signed-out' };
  }

  const result = await serverFetch<{ user: unknown }>('/api/auth/me', {
    cookie: incomingCookieHeader(),
  });

  if (result.ok) {
    const user = parseSessionUser(result.data);
    return user ? { status: 'authenticated', user, permissions: user.permissions } : { status: 'signed-out' };
  }

  // 401 UNAUTHENTICATED is the API saying "this cookie is not a session" -
  // expired, revoked, or an account that is no longer active.
  if (result.status === 401) {
    return { status: 'signed-out' };
  }

  return { status: 'unavailable', error: result.error };
});

/** The session, or null when there is none. `null` deliberately does not distinguish signed-out from unreachable; use `getSessionState` when the screen must. */
export async function getSession(): Promise<SessionUser | null> {
  const state = await getSessionState();
  return state.status === 'authenticated' ? state.user : null;
}

/**
 * A server-side API call made as the current caller. Pages use this instead of
 * `serverFetch` directly so the cookie is never forgotten - an unforwarded
 * cookie turns every page into a 401 that looks like a permissions bug.
 */
export function fetchAsCaller<T = any>(path: string, options: Omit<ServerFetchOptions, 'cookie'> = {}): Promise<ApiResult<T>> {
  return serverFetch<T>(path, { ...options, cookie: incomingCookieHeader() });
}
