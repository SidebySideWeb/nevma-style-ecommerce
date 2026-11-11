import { createClient, type SanityClient } from '@sanity/client';
import { assertServerOnly, serverEnv } from '../server/env';

assertServerOnly('sanity/client');

const API_VERSION = '2026-10-01';

function projectConfig() {
  const projectId =
    serverEnv('PUBLIC_SANITY_PROJECT_ID') || serverEnv('SANITY_STUDIO_PROJECT_ID');
  const dataset =
    serverEnv('PUBLIC_SANITY_DATASET') || serverEnv('SANITY_STUDIO_DATASET') || 'production';
  const token = serverEnv('SANITY_READ_TOKEN');
  if (!projectId) throw new Error('PUBLIC_SANITY_PROJECT_ID is required');
  if (!token) throw new Error('SANITY_READ_TOKEN is required for the private dataset');
  return { projectId, dataset, token };
}

let client: SanityClient | undefined;
let clientOverride: SanityClient | null | undefined;

/** Test seam: inject a mock client, or `null` to clear the override. */
export function setSanityClient(next: SanityClient | null | undefined): void {
  clientOverride = next;
  if (next === null) client = undefined;
}

/**
 * Server Sanity client (Viewer token). Private dataset → token required, CDN off.
 * Never import into a browser island.
 */
export function getSanityClient(): SanityClient {
  if (clientOverride !== undefined && clientOverride !== null) return clientOverride;
  if (client) return client;
  const { projectId, dataset, token } = projectConfig();
  client = createClient({
    projectId,
    dataset,
    apiVersion: API_VERSION,
    useCdn: false,
    perspective: 'published',
    token,
    ignoreBrowserTokenWarning: true,
  });
  return client;
}

export function sanityConfigured(): boolean {
  try {
    projectConfig();
    return true;
  } catch {
    return false;
  }
}

export async function sanityFetch<T>(
  query: string,
  params: Record<string, unknown> = {},
): Promise<T> {
  return getSanityClient().fetch<T>(query, params);
}
