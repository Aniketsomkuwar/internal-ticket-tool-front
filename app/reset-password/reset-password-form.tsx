'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { resetPasswordSchema } from '@/shared/index';

import { browserFetch, UNREACHABLE_MESSAGE } from '../../lib/api';
import { Alert } from '../../components/ui/alert';
import { Button } from '../../components/ui/button';
import { Field } from '../../components/ui/field';

/**
 * Choosing a new password from an emailed link (R014).
 *
 * Posts `{ token, password }` to the *relative* `/api/auth/password/reset`,
 * through the Next.js rewrite (D002). The token travels in the request body, not
 * the path, so it stays out of the API's request log - the same reason the API
 * never logs it either.
 *
 * The two values that can be refused are shown in two different places on
 * purpose. A password the rules reject belongs beside the field, because the
 * reader can fix it. A *link* the API refuses - expired, already used, or for a
 * deactivated account - is not something typing can fix, so it is one sentence
 * at the top of the form with the way out next to it. The API deliberately gives
 * one identical refusal for all three, so this screen cannot and must not claim
 * to know which it was.
 */

const MISMATCH_MESSAGE = 'The two passwords do not match.';

export interface ResetPasswordFormProps {
  /** The token from the emailed link, already checked against the shared schema. */
  token: string;
}

export function ResetPasswordForm({ token }: ResetPasswordFormProps) {
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ password?: string; confirmation?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [linkRefused, setLinkRefused] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [changed, setChanged] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setLinkRefused(false);

    const parsed = resetPasswordSchema.safeParse({ token, password });
    const next: { password?: string; confirmation?: string } = {};

    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        if (issue.path[0] === 'password' && !next.password) next.password = issue.message;
      }
    }
    if (password !== confirmation) {
      next.confirmation = MISMATCH_MESSAGE;
    }

    if (!parsed.success || Object.keys(next).length > 0) {
      setFieldErrors(next);
      return;
    }

    setFieldErrors({});
    setSubmitting(true);
    const result = await browserFetch<{ reset: true }>('/api/auth/password/reset', {
      method: 'POST',
      body: parsed.data,
    });

    if (result.ok) {
      setChanged(true);
      return;
    }

    setSubmitting(false);

    if (result.status === 0) {
      setFormError(UNREACHABLE_MESSAGE);
      return;
    }

    if (result.error.code === 'VALIDATION_FAILED') {
      const refusal: { password?: string; confirmation?: string } = {};
      let refusedLink = false;
      for (const field of result.error.details?.fields ?? []) {
        if (field.path === 'password' && !refusal.password) refusal.password = field.message;
        // There is no token field on screen, so a token refusal is a link
        // refusal: show it at the top, where the way to get a new link is.
        if (field.path === 'token') refusedLink = true;
      }
      setFieldErrors(refusal);
      if (refusedLink || Object.keys(refusal).length === 0) {
        setFormError(result.error.message);
        setLinkRefused(true);
        return;
      }
      // Field-specific refusals only: nothing to say at the top of the form.
      return;
    }

    setFormError(result.error.message);
  }

  if (changed) {
    return (
      <div className="flex flex-col gap-group">
        <Alert tone="success" title="Password changed">
          Your new password is ready to use, and every device that was signed in with the old one has
          been signed out.
        </Alert>
        <Link href="/login" className="text-sm text-link hover:underline">
          Go to sign in
        </Link>
      </div>
    );
  }

  return (
    <form className="flex flex-col gap-group" onSubmit={onSubmit} noValidate>
      {formError ? (
        <Alert tone="error" title="Could not set the new password">
          {formError}
        </Alert>
      ) : null}

      {linkRefused ? (
        <Link href="/forgot-password" className="text-sm text-link hover:underline">
          Request a new link
        </Link>
      ) : null}

      <Field
        label="New password"
        name="password"
        type="password"
        autoComplete="new-password"
        autoFocus
        required
        hint="At least 8 characters."
        value={password}
        error={fieldErrors.password}
        onChange={(event) => setPassword(event.target.value)}
      />

      <Field
        label="Confirm new password"
        name="confirmation"
        type="password"
        autoComplete="new-password"
        required
        value={confirmation}
        error={fieldErrors.confirmation}
        onChange={(event) => setConfirmation(event.target.value)}
      />

      {/* `loading` is what blocks a double submit: the primitive disables the
          button and announces `aria-busy` while it is set. */}
      <Button type="submit" variant="primary" size="lg" loading={submitting}>
        {submitting ? 'Setting the password' : 'Set the new password'}
      </Button>

      <Link href="/login" className="text-sm text-link hover:underline">
        Back to sign in
      </Link>
    </form>
  );
}
