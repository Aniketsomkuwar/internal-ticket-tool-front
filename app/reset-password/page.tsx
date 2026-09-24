import type { Metadata } from 'next';
import Link from 'next/link';
import { resetPasswordSchema } from '@/shared/index';

import { ResetPasswordForm } from './reset-password-form';
import { ErrorState } from '../../components/data-table/states';

/**
 * The screen an emailed reset link opens (R014).
 *
 * The token is read from the query string and validated with the *same* schema
 * the API validates the body with, so the two cannot drift: a link that would be
 * refused for being too short is refused here, before a form is offered that
 * could only fail. What the page cannot know is whether the token is still live
 * - that answer belongs to the API, and the form renders its refusal.
 *
 * A missing token is not a reason to show a password form: the request would go
 * to the API with `token: undefined` and come back as a generic refusal, which
 * is a worse explanation than the truth, which is that the link lost its token
 * on the way here (a mail client that stripped the query string, or a hand-copied
 * URL).
 */

export const metadata: Metadata = { title: 'Set a new password' };

export default function ResetPasswordPage({
  searchParams,
}: {
  /** Next hands back an array for a repeated parameter, so the type says so. */
  searchParams?: { token?: string | string[] };
}) {
  const rawToken = searchParams?.token;
  const token = Array.isArray(rawToken) ? rawToken[0] : rawToken;

  // `pick` rather than a second copy of the rule: the token's bounds live in the
  // shared schema, and a copied `length >= 32` here would be the copy that
  // silently stops matching.
  const usable = typeof token === 'string' && resetPasswordSchema.pick({ token: true }).safeParse({ token }).success;

  return (
    <section className="flex min-h-dvh flex-col items-center justify-center gap-group p-6">
      <div className="measure-form flex w-full flex-col gap-group">
        <header className="flex flex-col gap-control">
          <h1 className="text-2xl text-fg">Set a new password</h1>
          {usable ? (
            <p className="text-sm text-fg-muted">
              Choose a password for your Claim Desk account. Signing in everywhere else with the old
              password will stop working.
            </p>
          ) : null}
        </header>

        {usable ? (
          <ResetPasswordForm token={token as string} />
        ) : (
          <>
            <ErrorState
              title="This reset link is incomplete"
              message="The link you followed does not carry a usable reset token. Request a new link and open the one in the email."
              retryLabel="Try again"
            />
            <Link href="/forgot-password" className="text-sm text-link hover:underline">
              Request a new link
            </Link>
          </>
        )}
      </div>
    </section>
  );
}
