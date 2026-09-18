/** Where a signed-in user goes when no destination was asked for. */
export const DEFAULT_REDIRECT = '/dashboard'

/**
 * Validates the `?r=` destination the auth middleware puts on /login before it
 * is used as a redirect target. Only a path on this origin is allowed: a value
 * starting with `//` or `/\` is read as protocol-relative by browsers and would
 * send the user off-site, so anything but a single leading slash falls back.
 */
export function safeRedirectPath(value: unknown, fallback: string = DEFAULT_REDIRECT): string {
  return typeof value === 'string' && /^\/(?![/\\])/.test(value) ? value : fallback
}
