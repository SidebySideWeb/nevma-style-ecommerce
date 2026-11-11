import type { APIRoute } from 'astro';
import { handleContact } from '../../lib/server/form-handlers';

export const POST: APIRoute = async ({ request }) => handleContact(request);
