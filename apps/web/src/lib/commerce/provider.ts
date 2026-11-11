import { createFixtureProvider, type FixtureOptions } from './fixture';
import { createOffProvider } from './off';
import { createShopifyProvider } from './shopify';
import type { CommerceProvider, Phase1State } from './types';

export type { CommerceProvider };

export type CreateProviderOptions = FixtureOptions & {
  phase1States?: Record<string, Phase1State>;
  /** Override env detection in tests. */
  commerceEnabled?: boolean;
  commerceMock?: boolean;
};

function envFlag(name: string, fallback = false): boolean {
  const v = process.env[name];
  if (v == null) return fallback;
  return v === '1' || v === 'true';
}

export function createCommerceProvider(opts: CreateProviderOptions = {}): CommerceProvider {
  const enabled = opts.commerceEnabled ?? envFlag('COMMERCE_ENABLED', true);
  if (!enabled) return createOffProvider(opts.phase1States);

  const mock = opts.commerceMock ?? envFlag('COMMERCE_MOCK', false);
  if (mock) return createFixtureProvider({ fixtureFlags: opts.fixtureFlags });

  return createShopifyProvider();
}

export { createFixtureProvider, createOffProvider, createShopifyProvider };
