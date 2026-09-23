/**
 * Class name join. Deliberately tiny and dependency-free: the app needs to
 * concatenate conditional class strings, not to resolve Tailwind conflicts
 * (which would hide a real mistake - two competing utilities in one component -
 * rather than surface it).
 */
export type ClassValue = string | false | null | undefined;

export function cn(...values: ClassValue[]): string {
  return values.filter(Boolean).join(' ');
}
