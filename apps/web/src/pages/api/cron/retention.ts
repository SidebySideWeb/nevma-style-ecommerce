import type { APIRoute } from 'astro';
import { authorizeCron } from '../../../lib/server/cron-auth';
import { executeRetentionJob } from '../../../lib/server/jobs/wire';

export const GET: APIRoute = async ({ request }) => {
  if (!authorizeCron(request)) {
    return Response.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }
  const result = await executeRetentionJob();
  return Response.json({ ok: true, ...result });
};

export const POST = GET;
