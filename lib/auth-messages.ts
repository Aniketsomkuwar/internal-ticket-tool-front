/**
 * What the sign-in screen says when Google sign-in could not finish (R013, R061).
 *
 * The OAuth callback can only leave the browser on
 * `/login?error=<code>` with one of five fixed codes; the codes themselves are
 * an allowlist the API owns (`GOOGLE_FAILURE_CODES` in
 * `server/src/routes/google-auth.ts`, which is the file to change if a code is
 * ever added). The web workspace cannot import server code, so the list is
 * repeated here as the keys of the map below - and the map is the whole point of
 * the repetition:
 *
 *   - a reader gets a sentence, never `google_no_account`;
 *   - an unknown or absent code produces `null`, so a hand-written query string
 *     cannot put words on the page. The lookup is an own-property check, not
 *     `code in map`, because `?error=constructor` would otherwise find something
 *     on `Object.prototype` and render it.
 *
 * The copy is written for somebody who has never heard of OAuth: what happened,
 * what it means for their account, and what to do next. It carries no emoji and
 * no error code (R061).
 */

export const GOOGLE_ERROR_MESSAGES = {
  google_not_configured:
    'Google sign-in is not available on this installation. Sign in with your work email address instead, or ask an administrator to turn it on.',
  google_cancelled:
    'Google sign-in was cancelled, so nothing was changed. You can try again, or sign in with your work email address and password.',
  google_failed:
    'Google sign-in did not finish. Try again, and if it keeps failing sign in with your work email address and password.',
  google_no_account:
    'There is no Claim Desk account for that Google address. Ask an administrator to create one.',
  google_inactive:
    'That Claim Desk account has been deactivated. Ask an administrator to restore it before signing in.',
} as const;

export type GoogleErrorCode = keyof typeof GOOGLE_ERROR_MESSAGES;

/**
 * True only for one of the five codes above.
 *
 * `Object.hasOwn` rather than `in`: the argument arrives from a URL, and the
 * difference is whether `?error=valueOf` renders a JavaScript function's source
 * on the page.
 */
export function isGoogleErrorCode(code: unknown): code is GoogleErrorCode {
  return typeof code === 'string' && Object.hasOwn(GOOGLE_ERROR_MESSAGES, code);
}

/**
 * The sentence for a code, or `null` when there is nothing trustworthy to show.
 *
 * Typed as `unknown` on purpose: the value comes from `searchParams`, and
 * `?error=a&error=b` arrives as an array. An arbitrary query string is data, not
 * a typed argument, and this function is the boundary that decides which of it
 * is allowed onto the screen.
 */
export function googleErrorMessage(code: unknown): string | null {
  return isGoogleErrorCode(code) ? GOOGLE_ERROR_MESSAGES[code] : null;
}
