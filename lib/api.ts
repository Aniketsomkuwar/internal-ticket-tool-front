import { isApiErrorBody, type ApiErrorBody } from '@/shared/index';

/**
 * The one way the web app talks to the Claim Desk API.
 *
 * Two callers, two transport shapes, one result shape:
 *
 *   - `browserFetch` runs in the browser and requests the *relative* `/api/*`
 *     path, so the request travels through the Next.js rewrite (decision D002).
 *     The session cookie rides along as a same-origin credential and the
 *     browser never learns the API's origin.
 *   - `serverFetch` runs in a server component and calls the API origin
 *     directly, forwarding the incoming `cookie` header by hand - a server-side
 *     `fetch` has no cookie jar, and the rewrite is a browser/edge concern, not
 *     something a Node render can use.
 *
 * Neither throws on a failure response. Both return the shared failure shape
 * (`{code, message, details}`) so a screen switches on `code` to render plain
 * language instead of catching an exception halfway through a render, and both
 * convert a transport failure - connection refused, DNS failure, timeout,
 * unreadable body - into the same shape with `INTERNAL`. A server component that
 * could not reach the API must be able to render an error state naming it; the
 * alternative is a crash page where a retry should be.
 *
 * Why `serverFetch` takes the cookie as an argument instead of reading it here:
 * `next/headers` may only be imported into a module that is never bundled for
 * the browser, and the sign-in form imports `browserFetch` from this file. The
 * server-only caller (`lib/session.ts`) is the one that reads the request
 * cookies.
 */

/** Where the API answers from inside the Next.js process. Matches the rewrite's default in next.config.mjs. */
export const API_ORIGIN = process.env.API_ORIGIN ?? 'http://127.0.0.1:4000';

/**
 * A request that never answers is worse than one that answers badly: a server
 * component blocks the whole page on it. Ten seconds is long enough for a cold
 * query and short enough that a dead API becomes an inline error state rather
 * than a hung navigation.
 */
export const REQUEST_TIMEOUT_MS = 10_000;

export interface ApiSuccess<T> {
  ok: true;
  status: number;
  data: T;
  json: () => Promise<T>;
}

export interface ApiFailure {
  ok: false;
  /** 0 when the request never reached the API. */
  status: number;
  error: ApiErrorBody;
}

export type ApiResult<T> = ApiSuccess<T> | ApiFailure;

/** The message a transport failure (or an unreadable body) carries to the screen. */
export const UNREACHABLE_MESSAGE =
  'The Claim Desk API did not answer. It may be starting up or briefly unavailable - try again in a moment.';

const UNREADABLE_MESSAGE =
  'The Claim Desk API answered with something this page could not read. Try again in a moment.';

function failure(status: number, message: string): ApiFailure {
  return { ok: false, status, error: { code: 'INTERNAL', message } };
}

/**
 * Reads a response into the one result shape.
 *
 * A failure body is parsed with `isApiErrorBody` rather than trusted: a proxy
 * or a crash can return JSON that is not the API's failure shape, and rendering
 * an unknown payload's `message` to a user is how a stack trace reaches a
 * screen.
 */
export async function readApiResponse<T>(response: Response): Promise<ApiResult<T>> {
  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (response.ok) {
    // A 200 with an unreadable body is a real fault, not an empty success: the
    // caller would otherwise render `undefined` fields.
    return payload === null
      ? failure(response.status, UNREADABLE_MESSAGE)
      : {
          ok: true,
          status: response.status,
          data: payload as T,
          json: () => Promise.resolve(payload as T),
        };
  }

  if (isApiErrorBody(payload)) {
    return { ok: false, status: response.status, error: payload };
  }

  return failure(response.status, UNREADABLE_MESSAGE);
}

/** Distinguishes "we waited too long" from "nothing was listening" for the log line, not for the user. */
function describeTransportFailure(error: unknown): string {
  if (error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError')) {
    return 'the request timed out';
  }
  return error instanceof Error ? error.message : 'unknown transport failure';
}

export interface ServerFetchOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  /** The incoming request's raw `cookie` header, forwarded verbatim. */
  cookie?: string | null;
  /** JSON-serialised and sent with `content-type: application/json`. */
  body?: unknown;
}

/**
 * A server-side call to the API. Never cached: the response is a session or a
 * permission decision, and a cached one would keep a signed-out person signed in.
 */
export async function serverFetch<T>(
  path: string,
  options: ServerFetchOptions = {},
): Promise<ApiResult<T>> {
  const headers: Record<string, string> = { accept: 'application/json' };
  if (options.cookie) {
    headers.cookie = options.cookie;
  }
  if (options.body !== undefined) {
    headers['content-type'] = 'application/json';
  }

  try {
    const response = await fetch(new URL(path, API_ORIGIN), {
      method: options.method ?? 'GET',
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      cache: 'no-store',
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    return await readApiResponse<T>(response);
  } catch (error) {
    // Logged rather than swallowed: a page that renders "the API did not
    // answer" needs the operator to be able to see why from the web process.
    console.warn(
      `[claimdesk] server fetch ${options.method ?? 'GET'} ${path} failed: ${describeTransportFailure(error)}`,
    );
    return failure(0, UNREACHABLE_MESSAGE);
  }
}

export interface BrowserFetchOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  /** Sent as JSON. */
  body?: unknown;
  signal?: AbortSignal;
}

/**
 * A browser-side call to the API, through the Next.js rewrite.
 *
 * The path is relative on purpose: an absolute API URL in the browser bundle
 * would be a second, untested origin, would need CORS, and would hand the API
 * origin to anything that can read the bundle.
 */
export async function browserFetch<T>(
  path: string,
  options: BrowserFetchOptions = {},
): Promise<ApiResult<T>> {
  try {
    const response = await fetch(path, {
      method: options.method ?? 'GET',
      credentials: 'same-origin',
      cache: 'no-store',
      headers: {
        accept: 'application/json',
        ...(options.body === undefined ? {} : { 'content-type': 'application/json' }),
      },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: options.signal ?? AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    return await readApiResponse<T>(response);
  } catch (error) {
    console.warn(`[claimdesk] request ${options.method ?? 'GET'} ${path} failed: ${describeTransportFailure(error)}`);
    return failure(0, UNREACHABLE_MESSAGE);
  }
}
