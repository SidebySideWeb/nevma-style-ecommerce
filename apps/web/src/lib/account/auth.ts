import { createHash, randomBytes } from 'node:crypto';
import { assertServerOnly, serverEnv } from '../server/env';
import { openSession, sealSession } from '../server/session';
import {
  AUTH_STATE_COOKIE,
  CREATE_PROFILE_COOKIE,
  CREATE_PROFILE_MAX_AGE,
  clearSessionCookieHeader,
  readCookieValue,
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  sessionCookieHeader,
  type CreateProfile,
  type SessionData,
} from './session-data';

assertServerOnly('account/auth');

export type AuthDiscovery = {
  authorization_endpoint: string;
  token_endpoint: string;
  end_session_endpoint?: string;
};

export type AuthState = {
  state: string;
  nonce: string;
  verifier: string;
  next?: string;
};

function base64Url(buf: Buffer): string {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function pkcePair(): { verifier: string; challenge: string } {
  const verifier = base64Url(randomBytes(32));
  const challenge = base64Url(createHash('sha256').update(verifier).digest());
  return { verifier, challenge };
}

export function randomToken(bytes = 16): string {
  return base64Url(randomBytes(bytes));
}

export function shopDomain(): string {
  const d = serverEnv('SHOPIFY_STORE_DOMAIN');
  if (!d) throw new Error('SHOPIFY_STORE_DOMAIN is required');
  return d.replace(/^https?:\/\//, '').replace(/\/$/, '');
}

export function clientId(): string {
  const id = serverEnv('SHOPIFY_CUSTOMER_ACCOUNT_CLIENT_ID');
  if (!id) throw new Error('SHOPIFY_CUSTOMER_ACCOUNT_CLIENT_ID is required');
  return id;
}

export function callbackUri(origin: string): string {
  return `${origin.replace(/\/$/, '')}/account/callback`;
}

let discoveryCache: AuthDiscovery | null = null;

export async function discoverAuth(): Promise<AuthDiscovery> {
  if (discoveryCache) return discoveryCache;
  const shopId = serverEnv('SHOPIFY_SHOP_ID');
  if (shopId) {
    discoveryCache = {
      authorization_endpoint: `https://shopify.com/authentication/${shopId}/oauth/authorize`,
      token_endpoint: `https://shopify.com/authentication/${shopId}/oauth/token`,
      end_session_endpoint: `https://shopify.com/authentication/${shopId}/logout`,
    };
    return discoveryCache;
  }
  const res = await fetch(`https://${shopDomain()}/.well-known/openid-configuration`);
  if (!res.ok) throw new Error(`OIDC discovery failed: ${res.status}`);
  discoveryCache = (await res.json()) as AuthDiscovery;
  return discoveryCache;
}

export async function buildAuthorizeUrl(opts: {
  origin: string;
  email: string;
  next?: string;
}): Promise<{ url: string; stateCookie: string }> {
  const { verifier, challenge } = pkcePair();
  const state = randomToken();
  const nonce = randomToken();
  const authState: AuthState = {
    state,
    nonce,
    verifier,
    ...(opts.next ? { next: opts.next } : {}),
  };
  const sealed = await sealSession(authState, 60 * 10);
  const disc = await discoverAuth();
  const params = new URLSearchParams({
    client_id: clientId(),
    response_type: 'code',
    redirect_uri: callbackUri(opts.origin),
    scope: 'openid email customer-account-api:full',
    state,
    nonce,
    code_challenge: challenge,
    code_challenge_method: 'S256',
    login_hint: opts.email,
  });
  const secure = process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production';
  const stateCookie = `${AUTH_STATE_COOKIE}=${encodeURIComponent(sealed)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 10}${secure ? '; Secure' : ''}`;
  return { url: `${disc.authorization_endpoint}?${params}`, stateCookie };
}

export async function sealCreateProfile(profile: CreateProfile): Promise<string> {
  return sealSession(profile, CREATE_PROFILE_MAX_AGE);
}

export function createProfileCookieHeader(token: string): string {
  const secure = process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production';
  return `${CREATE_PROFILE_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${CREATE_PROFILE_MAX_AGE}${secure ? '; Secure' : ''}`;
}

export function clearCreateProfileCookieHeader(): string {
  return `${CREATE_PROFILE_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

export function clearAuthStateCookieHeader(): string {
  return `${AUTH_STATE_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

export async function readAuthState(cookieHeader: string | null): Promise<AuthState | null> {
  const tok = readCookieValue(cookieHeader, AUTH_STATE_COOKIE);
  return tok ? openSession<AuthState>(tok) : null;
}

export async function readCreateProfile(cookieHeader: string | null): Promise<CreateProfile | null> {
  const tok = readCookieValue(cookieHeader, CREATE_PROFILE_COOKIE);
  return tok ? openSession<CreateProfile>(tok) : null;
}

export async function readSession(cookieHeader: string | null): Promise<SessionData | null> {
  const tok = readCookieValue(cookieHeader, SESSION_COOKIE);
  return tok ? openSession<SessionData>(tok) : null;
}

export type TokenResponse = {
  access_token: string;
  expires_in: number;
  id_token?: string;
  refresh_token?: string;
};

export async function exchangeCode(opts: {
  code: string;
  verifier: string;
  origin: string;
}): Promise<TokenResponse> {
  const disc = await discoverAuth();
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: clientId(),
    redirect_uri: callbackUri(opts.origin),
    code: opts.code,
    code_verifier: opts.verifier,
  });
  const res = await fetch(disc.token_endpoint, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Token exchange failed: ${res.status} ${text}`);
  }
  return (await res.json()) as TokenResponse;
}

export async function refreshAccessToken(refreshToken: string): Promise<TokenResponse> {
  const disc = await discoverAuth();
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: clientId(),
    refresh_token: refreshToken,
  });
  const res = await fetch(disc.token_endpoint, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Token refresh failed: ${res.status} ${text}`);
  }
  return (await res.json()) as TokenResponse;
}

/** Refresh when < 5 minutes remain. Returns updated session + Set-Cookie, or null if unchanged / failed. */
export async function maybeRefreshSession(
  session: SessionData,
): Promise<{ session: SessionData; cookie: string } | null> {
  const left = session.expiresAt - Math.floor(Date.now() / 1000);
  if (left >= 5 * 60) return null;
  if (!session.refreshToken) return null;
  try {
    const tokens = await refreshAccessToken(session.refreshToken);
    const next: SessionData = {
      ...session,
      accessToken: tokens.access_token,
      expiresAt: Math.floor(Date.now() / 1000) + tokens.expires_in,
      ...(tokens.refresh_token ? { refreshToken: tokens.refresh_token } : {}),
      ...(tokens.id_token ? { idToken: tokens.id_token } : {}),
    };
    const sealed = await sealSession(next, SESSION_MAX_AGE);
    return { session: next, cookie: sessionCookieHeader(sealed) };
  } catch {
    return null;
  }
}

export async function buildLogoutUrl(session: SessionData | null, origin: string): Promise<string> {
  const disc = await discoverAuth();
  if (!disc.end_session_endpoint) return `${origin.replace(/\/$/, '')}/`;
  const params = new URLSearchParams({
    post_logout_redirect_uri: `${origin.replace(/\/$/, '')}/`,
  });
  if (session?.idToken) params.set('id_token_hint', session.idToken);
  return `${disc.end_session_endpoint}?${params}`;
}

export { sessionCookieHeader, clearSessionCookieHeader, SESSION_MAX_AGE };
