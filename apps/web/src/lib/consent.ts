/** Client + server helpers for `ns_consent` (analytics opt-in). */

export const CONSENT_COOKIE = 'ns_consent';
export const CONSENT_MAX_AGE = 60 * 60 * 24 * 183; // ~6 months

export type ConsentState = {
  essential: true;
  analytics: boolean;
};

export function parseConsent(cookieHeader: string | null | undefined): ConsentState | null {
  if (!cookieHeader) return null;
  const m = cookieHeader.match(/(?:^|;\s*)ns_consent=([^;]*)/);
  if (!m?.[1]) return null;
  try {
    const raw = decodeURIComponent(m[1]);
    const parsed = JSON.parse(raw) as { analytics?: boolean };
    return { essential: true, analytics: Boolean(parsed.analytics) };
  } catch {
    if (m[1] === '1' || m[1] === 'analytics') return { essential: true, analytics: true };
    if (m[1] === '0' || m[1] === 'essential') return { essential: true, analytics: false };
    return null;
  }
}

export function consentCookieValue(analytics: boolean): string {
  return encodeURIComponent(JSON.stringify({ analytics }));
}

export function consentCookieHeader(analytics: boolean): string {
  return `${CONSENT_COOKIE}=${consentCookieValue(analytics)}; Path=/; SameSite=Lax; Max-Age=${CONSENT_MAX_AGE}`;
}
