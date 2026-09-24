'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { forgotPasswordSchema } from '@/shared/index';

import { browserFetch, UNREACHABLE_MESSAGE } from '../../lib/api';
import { Alert } from '../../components/ui/alert';
import { Button } from '../../components/ui/button';
import { Field } from '../../components/ui/field';

/**
 * The reset-request form (R014).
 *
 * Posts to the *relative* `/api/auth/password/forgot`, through the Next.js
 * rewrite (D002).
 *
 * **The confirmation says nothing about the address.** The API answers one
 * identical 200 for a known address, an unknown address and a failed delivery,
 * and this screen must not undo that by wording a luckier answer for a real
 * account - the whole reason the API is shaped that way is that a stranger could
 * otherwise use this form to find out who works here. So the success state is a
 * single sentence that is true for every address.
 *
 * The one failure that is worth its own words is an installation with no mail
 * transport (`503 MAIL_NOT_CONFIGURED`): there the honest answer is "recovery is
 * not available here", which is what the API's own message already says.
 */

export function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [fieldError, setFieldError] = useState<string | undefined>(undefined);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const parsed = forgotPasswordSchema.safeParse({ email });
    if (!parsed.success) {
      setFieldError(parsed.error.issues[0]?.message ?? 'Enter your email address.');
      return;
    }

    setFieldError(undefined);
    setSubmitting(true);
    const result = await browserFetch<{ requested: true }>('/api/auth/password/forgot', {
      method: 'POST',
      body: parsed.data,
    });

    if (result.ok) {
      setSent(true);
      return;
    }

    setSubmitting(false);
    setFormError(result.status === 0 ? UNREACHABLE_MESSAGE : result.error.message);
  }

  if (sent) {
    return (
      <div className="flex flex-col gap-group">
        <Alert tone="success" title="Check your email">
          If that address has a Claim Desk account, a reset link is on its way. It expires in one
          hour.
        </Alert>
        <Link href="/login" className="text-sm text-link hover:underline">
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <form className="flex flex-col gap-group" onSubmit={onSubmit} noValidate>
      {formError ? (
        <Alert tone="error" title="Could not send the link">
          {formError}
        </Alert>
      ) : null}

      <Field
        label="Email address"
        name="email"
        type="email"
        autoComplete="username"
        autoFocus
        required
        value={email}
        error={fieldError}
        onChange={(event) => setEmail(event.target.value)}
      />

      <Button type="submit" variant="primary" size="lg" loading={submitting}>
        {submitting ? 'Sending the link' : 'Send the reset link'}
      </Button>

      <Link href="/login" className="text-sm text-link hover:underline">
        Back to sign in
      </Link>
    </form>
  );
}
