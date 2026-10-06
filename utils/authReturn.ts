/*
 * The page a staff member was on when the session ended, kept in sessionStorage across the login (the login page, then
 * Zitadel's callback page, all in the same tab) so that signing back in lands there and not on the orders board.
 */

import { hasText } from '~/utils/guards'

const RETURN_KEY = 'oidc_return_to'

/**
 * A return path is only honoured when it stays on this site: an absolute path, not protocol-relative (`//evil`),
 * and not the auth flow itself (that would loop the staff member back to the login page). Browsers read a backslash as a
 * slash and drop tabs and line breaks inside a URL, so `/\evil.example` and `/<TAB>/evil.example` are `//evil.example`:
 * any backslash or control character disqualifies the path.
 */
export function sanitizeReturnTo(raw: string | null | undefined): string | null {
  if (!hasText(raw) || !raw.startsWith('/') || raw.startsWith('//')) return null
  // oxlint-disable-next-line no-control-regex -- the point is to refuse control characters
  if (/[\\\u0000-\u001f\u007f]/u.test(raw)) return null
  if (/^\/(?:[^/]+\/)?auth(?:\/|\?|#|$)/u.test(raw)) return null
  return raw
}

/** Remembers a path (a route's `fullPath`) as the page to come back to; refused paths and unavailable storage are ignored. */
export function rememberReturnTo(path: string): void {
  const safe = sanitizeReturnTo(path)
  if (!hasText(safe)) return
  try {
    sessionStorage.setItem(RETURN_KEY, safe)
  } catch {
    // Storage unavailable (private mode, no window): the staff member simply lands on the default page.
  }
}

/** Remembers the page the browser is on now (`rememberReturnTo` of its path, query and hash). */
export function rememberCurrentPage(): void {
  if (typeof window === 'undefined') return
  const { pathname, search, hash } = window.location
  rememberReturnTo(`${pathname}${search}${hash}`)
}

/** The remembered page, once: it is forgotten as it is read. Null when there is none or it is not a safe path. */
export function consumeReturnTo(): string | null {
  try {
    const raw = sessionStorage.getItem(RETURN_KEY)
    sessionStorage.removeItem(RETURN_KEY)
    return sanitizeReturnTo(raw)
  } catch {
    return null
  }
}
