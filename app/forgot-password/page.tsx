import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { ForgotPasswordForm } from './forgot-password-form';
import { getSessionState } from '../../lib/session';
import { ErrorState } from '../../components/data-table/states';

/**
 * "Forgot my password" (R014).
 *
 * A signed-out screen, like the sign-in page: somebody with a working session
 * has no reason to be here (they can change their password from the account
 * screen), so they are sent on. Nothing on this page depends on who is asking -
 * the API answers the same way for a known and an unknown address.
 *
 * The form is not offered while the API is unreachable, for the same reason the
 * sign-in form is not: the request would fail for a reason that has nothing to
 * do with the address typed into it.
 */

export const metadata: Metadata = { title: 'Reset your password' };

export default async function ForgotPasswordPage() {
  const state = await getSessionState();

  if (state.status === 'authenticated') {
    redirect('/');
  }

  return (
    <section className="flex min-h-dvh flex-col items-center justify-center gap-group p-6">
      <div className="measure-form flex w-full flex-col gap-group">
        <header className="flex flex-col gap-control">
          <h1 className="text-2xl text-fg">Reset your password</h1>
          <p className="text-sm text-fg-muted">
            Enter the email address on your Claim Desk account and we will send you a link to set a
            new password.
          </p>
        </header>

        {state.status === 'unavailable' ? (
          <ErrorState
            title="The API is not answering"
            message={state.error.message}
            retryLabel="Try again"
          />
        ) : (
          <ForgotPasswordForm />
        )}
      </div>
    </section>
  );
}
