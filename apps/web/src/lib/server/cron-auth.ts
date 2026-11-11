import { serverEnv } from './env';

/** Vercel Cron sends `Authorization: Bearer <CRON_SECRET>`. */
export function authorizeCron(request: Request, secret = serverEnv('CRON_SECRET')): boolean {
  if (!secret) return false;
  const header = request.headers.get('authorization') || '';
  return header === `Bearer ${secret}`;
}
