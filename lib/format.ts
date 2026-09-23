/**
 * The one shared formatter. Every user-facing value that could be missing,
 * malformed or a number in a column passes through here, so `undefined` and
 * `null` never reach a user - they become an em dash instead.
 *
 * Locale is fixed to `en-US` and timestamps are formatted in UTC: a claim desk
 * is read by several people at once, and a timestamp that shifts with the
 * reader's machine is a timestamp nobody can quote to a colleague.
 */

/** Rendered in place of a missing, empty or unparseable value. */
export const PLACEHOLDER = '\u2014';

type DateLike = Date | string | number | null | undefined;

const DATE_TIME_FORMAT = new Intl.DateTimeFormat('en-US', {
  timeZone: 'UTC',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  timeZoneName: 'short',
});

const DATE_FORMAT = new Intl.DateTimeFormat('en-US', {
  timeZone: 'UTC',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const ELAPSED_FORMAT = new Intl.RelativeTimeFormat('en-US', { numeric: 'auto' });

const MONEY_FORMAT = new Map<string, Intl.NumberFormat>();
const CURRENCY_DIGITS = new Map<string, number>();

function moneyFormatter(currency: string): Intl.NumberFormat {
  let formatter = MONEY_FORMAT.get(currency);
  if (!formatter) {
    formatter = new Intl.NumberFormat('en-US', { style: 'currency', currency });
    MONEY_FORMAT.set(currency, formatter);
  }
  return formatter;
}

function fractionDigits(currency: string): number {
  let digits = CURRENCY_DIGITS.get(currency);
  if (digits === undefined) {
    digits = moneyFormatter(currency).resolvedOptions().maximumFractionDigits ?? 2;
    CURRENCY_DIGITS.set(currency, digits);
  }
  return digits;
}

function toDate(value: DateLike): Date | null {
  if (value === null || value === undefined || value === '') return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Integer minor units through `Intl`, using the currency's own fraction digits
 * rather than an assumed two - a yen amount and a dollar amount do not divide
 * the same way.
 */
export function formatMoney(amountMinor: number | null | undefined, currency = 'USD'): string {
  if (amountMinor === null || amountMinor === undefined || !Number.isFinite(amountMinor)) {
    return PLACEHOLDER;
  }
  return moneyFormatter(currency).format(amountMinor / 10 ** fractionDigits(currency));
}

/** `MM/DD/YYYY`, in UTC. */
export function formatDate(value: DateLike): string {
  const date = toDate(value);
  return date ? DATE_FORMAT.format(date) : PLACEHOLDER;
}

/** `MM/DD/YYYY, HH:MM UTC`, in UTC. */
export function formatTimestamp(value: DateLike): string {
  const date = toDate(value);
  return date ? DATE_TIME_FORMAT.format(date) : PLACEHOLDER;
}

const ELAPSED_UNITS: ReadonlyArray<readonly [Intl.RelativeTimeFormatUnit, number]> = [
  ['year', 31_536_000],
  ['month', 2_592_000],
  ['week', 604_800],
  ['day', 86_400],
  ['hour', 3_600],
  ['minute', 60],
  ['second', 1],
];

/**
 * A timestamp the way a reader scans one: "3 hours ago", "in 2 days". Intended
 * for a slot paired with `formatElapsedTitle` in the `title` attribute, so the
 * absolute value stays reachable.
 */
export function formatElapsed(value: DateLike, now: Date = new Date()): string {
  const date = toDate(value);
  if (!date) return PLACEHOLDER;

  const deltaSeconds = (date.getTime() - now.getTime()) / 1000;
  const magnitude = Math.abs(deltaSeconds);
  if (magnitude < 45) return ELAPSED_FORMAT.format(0, 'second');

  for (const [unit, seconds] of ELAPSED_UNITS) {
    if (magnitude >= seconds || unit === 'second') {
      return ELAPSED_FORMAT.format(Math.round(deltaSeconds / seconds), unit);
    }
  }
  return PLACEHOLDER;
}

/** The absolute timestamp for the `title` of a relative one; `undefined` when there is nothing to show. */
export function formatElapsedTitle(value: DateLike): string | undefined {
  const date = toDate(value);
  return date ? DATE_TIME_FORMAT.format(date) : undefined;
}
