import type { APIRoute } from 'astro';
import { handleSubscribe } from '../../lib/server/form-handlers';

export const POST: APIRoute = async ({ request }) => handleSubscribe(request);
