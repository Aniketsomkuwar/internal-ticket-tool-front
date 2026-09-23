'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { loginSchema } from '@/shared';

import { browserFetch, UNREACHABLE_MESSAGE } from '../../lib/api';
import { Alert } from '../../components/ui/alert';
import { Button } from '../../components/ui/button';
import { Field } from '../../components/ui/field';

/**
 * The sign-in form (R001, R013).
 *
 * Posts to the *relative* `/api/auth/login`, so the request goes through the
 * Next.js rewrite and the browser never learns the API's origin. On success the
 * API has already set the signed session cookie; the form holds no token of its
 * own and writes nothing to `localStorage` - the session exists in one place,
 * httpOnly, where page scripts cannot read it.
 *
 * Client-side validation uses the same Zod schema the API re-validates with, so
 * the rules cannot drift; the client copy exists for immediate feedback, never
 * as a defence.
 *
 * **The Google control is a link, not a button.** `/api/auth/google/start`
 * answers with a 302 to Google, and browsers only follow a redirect for a
 * top-level navigation - a `fetch` would receive the redirect's body, not the
 * consent screen, and the rewrite would have to be bypassed. So it is a real
 * `href`, relative so it still travels through the rewrite (D002), and the
 * button primitive renders it as an anchor for exactly this reason.
 */

interface LoginResponse {
  user: unknown;
}

export interface LoginFormProps {
  /**
   * The sentence for a Google refusal carried in the URL, already mapped from
   * the API's fixed code by the page. `null` when there was no code, or when the
   * code was not one of the five.
   */
  googleError?: string | null;
}

export function LoginForm({ googleError = null }: LoginFormProps) {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      const next: { email?: string; password?: string } = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0];
        if (field === 'email' && !next.email) next.email = issue.message;
        if (field === 'password' && !next.password) next.password = issue.message;
      }
      setFieldErrors(next);
      return;
    }

    setFieldErrors({});
    setSubmitting(true);
    const result = await browserFetch<LoginResponse>('/api/auth/login', {
      method: 'POST',
      body: parsed.data,
    });

    if (result.ok) {
      // replace, not push: the sign-in screen should not sit in history behind
      // an authenticated session. refresh re-runs the server render, which now
      // resolves the new cookie.
      router.replace('/');
      router.refresh();
      return;
    }

    setSubmitting(false);

    switch (result.error.code) {
      case 'INVALID_CREDENTIALS':
        // The API deliberately does not say which half was wrong, so neither
        // does this message.
        setFormError('That email and password combination was not recognised. Check both and try again.');
        break;
      case 'VALIDATION_FAILED': {
        const next: { email?: string; password?: string } = {};
        for (const field of result.error.details?.fields ?? []) {
          if (field.path === 'email' && !next.email) next.email = field.message;
          if (field.path === 'password' && !next.password) next.password = field.message;
        }
        setFieldErrors(next);
        setFormError('Some of the details need correcting.');
        break;
      }
      case 'RATE_LIMITED':
        setFormError(result.error.message);
        break;
      default:
        setFormError(result.status === 0 ? UNREACHABLE_MESSAGE : result.error.message);
    }
  }

  return (
    <form className="flex flex-col gap-group" onSubmit={onSubmit} noValidate>
      {googleError ? (
        <Alert tone="error" title="Google sign-in did not finish">
          {googleError}
        </Alert>
      ) : null}

      {formError ? (
        <Alert tone="error" title="Could not sign you in">
          {formError}
        </Alert>
      ) : null}

      {/* <Button href="/api/auth/google/start" variant="secondary" size="lg" className="w-full">
        Continue with Google
      </Button> */}

      {/* Two ways in, one of them: the divider is a written word rather than a
          rule with nothing on it, because a bare line reads as a page break. */}
      <div className="flex items-center gap-control" role="separator" aria-orientation="horizontal">
        <span className="flex-1 border-t border-line" />
        <span className="text-xs text-fg-subtle">or</span>
        <span className="flex-1 border-t border-line" />
      </div>

      <Field
        label="Email address"
        name="email"
        type="email"
        autoComplete="username"
        autoFocus
        required
        value={email}
        error={fieldErrors.email}
        onChange={(event) => setEmail(event.target.value.replace(/\s/g, ''))}
      />

      <Field
        label="Password"
        name="password"
        type="password"
        autoComplete="current-password"
        required
        value={password}
        error={fieldErrors.password}
        onChange={(event) => setPassword(event.target.value)}
      />

      <div className="flex justify-end">
        <Link href="/forgot-password" className="text-sm text-link hover:underline">
          Forgot your password?
        </Link>
      </div>

      <Button type="submit" variant="primary" size="lg" loading={submitting}>
        {submitting ? 'Signing in' : 'Sign in'}
      </Button>
    </form>
  );
}
