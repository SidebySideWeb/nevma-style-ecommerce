import type { APIRoute } from 'astro';
import { handleNotify } from '../../lib/server/form-handlers';
import { isCommerceMock } from '../../lib/server/env';
import { sanityFetch } from '../../lib/sanity/client';

export const POST: APIRoute = async ({ request }) => {
  return handleNotify(request, {
    lookupDrop: async (dropId) => {
      if (isCommerceMock()) return null;
      try {
        return await sanityFetch<{ code: string; name: string } | null>(
          `*[_type == "drop" && _id == $id][0]{code, name}`,
          { id: dropId },
        );
      } catch {
        return null;
      }
    },
  });
};
