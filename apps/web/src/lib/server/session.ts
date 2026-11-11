import { createHash } from 'node:crypto';
import { CompactEncrypt, compactDecrypt } from 'jose';
import { assertServerOnly, serverEnv } from './env';

assertServerOnly('session');

function keyBytes(): Uint8Array {
  const secret = serverEnv('SESSION_SECRET');
  if (!secret || secret.length < 16) throw new Error('SESSION_SECRET must be set (16+ chars)');
  return createHash('sha256').update(secret).digest();
}

/** Encrypt JSON as a compact JWE (dir + A256GCM). */
export async function sealSession<T extends Record<string, unknown>>(
  data: T,
  maxAgeSec = 60 * 60 * 24 * 7,
): Promise<string> {
  const payload = new TextEncoder().encode(
    JSON.stringify({ ...data, exp: Math.floor(Date.now() / 1000) + maxAgeSec }),
  );
  return new CompactEncrypt(payload)
    .setProtectedHeader({ alg: 'dir', enc: 'A256GCM' })
    .encrypt(keyBytes());
}

/** Decrypt a session cookie. Returns null if missing, expired, or tampered. */
export async function openSession<T extends Record<string, unknown>>(
  token: string | undefined | null,
): Promise<T | null> {
  if (!token) return null;
  try {
    const { plaintext } = await compactDecrypt(token, keyBytes());
    const data = JSON.parse(new TextDecoder().decode(plaintext)) as T & { exp?: number };
    if (typeof data.exp === 'number' && data.exp * 1000 < Date.now()) return null;
    return data;
  } catch {
    return null;
  }
}
