import type { APIRoute } from 'astro';
import { readSession } from '../../../lib/account/auth';
import { customerUpdate, setEmailMarketingConsent } from '../../../lib/account/customer-api';
import { formError, formSuccess, parseForm } from '../../../lib/server/http';
import { isCommerceMock } from '../../../lib/server/env';
import { setPrefs } from '../../../lib/server/sanity-write';

export const POST: APIRoute = async ({ request }) => {
  const body = await parseForm(request);
  const action = (body.action || 'save').trim();

  if (isCommerceMock()) {
    return formSuccess(request, '/account/profile', { ok: true });
  }

  const session = await readSession(request.headers.get('cookie'));
  if (!session?.accessToken || !session.customerId) {
    return formError(request, 'Signed out', 401, '/account/sign-in');
  }

  try {
    if (action === 'prefs') {
      const dropAlerts = body.dropAlerts === 'true' || body.dropAlerts === '1';
      const moments = body.moments === 'true' || body.moments === '1';
      const letter = body.letter === 'true' || body.letter === '1';
      await setPrefs(session.customerId, { dropAlerts, moments }, session.email);
      if (session.email && body.letter != null) {
        await setEmailMarketingConsent(session.accessToken, session.email, letter).catch(
          () => undefined,
        );
      }
      return formSuccess(request, '/account/profile', { ok: true });
    }

    await customerUpdate(session.accessToken, {
      firstName: (body.firstName || '').trim() || undefined,
      lastName: (body.lastName || '').trim() || undefined,
    });
    return formSuccess(request, '/account/profile', { ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Save failed';
    return formError(request, message, 500, '/account/profile');
  }
};
