import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { LoginForm } from './login-form';
import { getSessionState } from '../../lib/session';
import { googleErrorMessage } from '../../lib/auth-messages';
import { ErrorState } from '../../components/data-table/states';

/**
 * The sign-in screen (R001, R013).
 *
 * Single column, no shell: the rail and top bar describe a workspace, and
 * there is nothing in the workspace to describe until the session exists. That
 * is why the signed-in screens live in the `(app)` route group and this one does
 * not - the layout that redirects to here must not wrap the page it redirects
 * to.
 *
 * A caller who already has a session is sent on rather than shown a second
 * chance to sign in.
 *
 * The `error` query parameter is read here, on the server, rather than in the
 * form with `useSearchParams`: the Google callback arrives as a browser
 * navigation, and mapping the code during the render means the sentence is in
 * the HTML the browser receives - no Suspense boundary, no second request, and
 * nothing to hydrate before the reason is readable. `googleErrorMessage` returns
 * `null` for anything that is not one of the API's fixed codes, which is what
 * keeps a hand-written query string from putting words on the page.
 */

export const metadata: Metadata = { title: 'Sign in' };

export default async function LoginPage({
  searchParams,
}: {
  /** Next hands back an array for a repeated parameter, so the type says so. */
  searchParams?: { error?: string | string[] };
}) {
  const state = await getSessionState();

  if (state.status === 'authenticated') {
    redirect('/');
  }

  const rawError = searchParams?.error;
  const googleError = googleErrorMessage(Array.isArray(rawError) ? rawError[0] : rawError);

  return (
    <section className="flex min-h-dvh flex-col items-center justify-center gap-group p-6">
      <div className="measure-form flex w-full flex-col gap-group">
        <header className="flex flex-col gap-control">
          <h1 className="text-2xl text-fg">Claim Desk</h1>
          <p className="text-sm text-fg-muted">
            Sign in with your work email address.
          </p>
        </header>

        {state.status === 'unavailable' ? (
          // The sign-in form would fail for a reason that has nothing to do with
          // the credentials, so it is not offered until the API answers.
          <ErrorState
            title="The API is not answering"
            message={state.error.message}
            retryLabel="Try again"
          />
        ) : (
          // The mapped sentence travels to the form as a prop: the form renders
          // it in the same place as its own failures instead of fetching a
          // second time, and the failure is already in the server's HTML.
          <LoginForm googleError={googleError} />
        )}
      </div>
    </section>
  );
}
