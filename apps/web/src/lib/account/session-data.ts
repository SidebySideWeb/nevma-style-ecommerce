/** Encrypted `ns_session` payload (Customer Account tokens + identity). */
export type SessionData = {
  customerId: string;
  email?: string;
  accessToken: string;
  refreshToken?: string;
  idToken?: string;
  /** Unix seconds when the access token expires. */
  expiresAt: number;
  firstName?: string;
  lastName?: string;
};

/** Short-lived create-mode profile applied after OAuth callback. */
export type CreateProfile = {
  firstName?: string;
  lastName?: string;
  dropAlerts?: boolean;
  letter?: boolean;
};

export const SESSION_COOKIE = 'ns_session';
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30;
export const AUTH_STATE_COOKIE = 'ns_auth';
export const CREATE_PROFILE_COOKIE = 'ns_create';
export const CREATE_PROFILE_MAX_AGE = 60 * 10;

export function sessionCookieHeader(token: string, maxAge = SESSION_MAX_AGE): string {
  const secure = process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production';
  return `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure ? '; Secure' : ''}`;
}

export function clearSessionCookieHeader(): string {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

export function readCookieValue(cookieHeader: string | null, name: string): string | null {
  if (!cookieHeader) return null;
  const m = cookieHeader.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return m?.[1] ? decodeURIComponent(m[1]) : null;
}
