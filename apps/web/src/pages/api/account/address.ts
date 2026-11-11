import type { APIRoute } from 'astro';
import { readSession } from '../../../lib/account/auth';
import {
  customerAddressCreate,
  customerAddressDelete,
  customerAddressUpdate,
} from '../../../lib/account/customer-api';
import { formError, formSuccess, parseForm } from '../../../lib/server/http';
import { isCommerceMock } from '../../../lib/server/env';

export const POST: APIRoute = async ({ request }) => {
  const body = await parseForm(request);
  const action = (body.action || 'create').trim();

  if (isCommerceMock()) {
    return formSuccess(request, '/account/addresses', { ok: true });
  }

  const session = await readSession(request.headers.get('cookie'));
  if (!session?.accessToken) {
    return formError(request, 'Signed out', 401, '/account/sign-in');
  }

  try {
    if (action === 'delete') {
      await customerAddressDelete(session.accessToken, body.id);
      return formSuccess(request, '/account/addresses', { ok: true });
    }

    const address = {
      firstName: (body.firstName || '').trim(),
      lastName: (body.lastName || '').trim(),
      company: (body.company || '').trim(),
      address1: (body.address1 || '').trim(),
      address2: (body.address2 || '').trim(),
      city: (body.city || '').trim(),
      zip: (body.zip || '').trim(),
      territoryCode: (body.territoryCode || 'GB').trim(),
    };
    const makeDefault = body.default === 'on' || body.default === 'true' || body.default === '1';

    if (action === 'update' && body.id) {
      await customerAddressUpdate(session.accessToken, body.id, address, makeDefault);
    } else if (action === 'default' && body.id) {
      await customerAddressUpdate(session.accessToken, body.id, address, true);
    } else {
      await customerAddressCreate(session.accessToken, address, makeDefault);
    }
    return formSuccess(request, '/account/addresses', { ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Address update failed';
    return formError(request, message, 500, '/account/addresses');
  }
};
