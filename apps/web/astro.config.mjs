import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, envField } from 'astro/config';
import vercel from '@astrojs/vercel';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

// astro.config runs before Vite loads .env. The kit's example lives at the repo root.
function fileEnv(name) {
  for (const file of ['.env.local', '.env']) {
    const path = resolve(repoRoot, file);
    if (!existsSync(path)) continue;
    for (const line of readFileSync(path, 'utf8').split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq === -1) continue;
      if (trimmed.slice(0, eq).trim() !== name) continue;
      let value = trimmed.slice(eq + 1).trim();
      const comment = value.search(/\s+#/);
      if (comment !== -1) value = value.slice(0, comment).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      return value;
    }
  }
  return undefined;
}

const env = (name) => process.env[name] || fileEnv(name);
const site = env('PUBLIC_SITE_URL') || 'http://localhost:4321';
const revalidateSecret = env('SANITY_REVALIDATE_SECRET');

// ISR for editorial routes. Bag, account, wishlist, APIs and server islands stay fresh.
const isrExclude = [
  '/bag',
  '/wishlist',
  /^\/account(?:\/.*)?$/,
  /^\/api\/.+/,
  /^\/_server-islands\/.+/,
];

const secret = (optional = true) =>
  envField.string({ context: 'server', access: 'secret', optional });

export default defineConfig({
  site,
  output: 'server',
  adapter: vercel({
    isr: {
      ...(revalidateSecret ? { bypassToken: revalidateSecret } : {}),
      exclude: isrExclude,
    },
  }),
  vite: { envDir: repoRoot },
  env: {
    schema: {
      // Client. Safe to ship in the browser bundle.
      PUBLIC_SITE_URL: envField.string({
        context: 'client',
        access: 'public',
        url: true,
        default: 'http://localhost:4321',
      }),
      PUBLIC_SANITY_PROJECT_ID: envField.string({
        context: 'client',
        access: 'public',
        optional: true,
      }),
      PUBLIC_SANITY_DATASET: envField.string({
        context: 'client',
        access: 'public',
        default: 'production',
      }),
      PUBLIC_TURNSTILE_SITE_KEY: envField.string({
        context: 'client',
        access: 'public',
        default: '1x00000000000000000000AA',
      }),

      // Server, not secret. COMMERCE_MOCK is "1" / "0" in .env.example (boolean only accepts true/false).
      COMMERCE_ENABLED: envField.boolean({ context: 'server', access: 'public', default: true }),
      COMMERCE_MOCK: envField.enum({
        context: 'server',
        access: 'public',
        values: ['0', '1'],
        default: '0',
      }),
      PUBLIC_FIXED_NOW: envField.string({ context: 'server', access: 'public', optional: true }),
      SHOPIFY_STORE_DOMAIN: envField.string({ context: 'server', access: 'public', optional: true }),
      SHOPIFY_API_VERSION: envField.string({
        context: 'server',
        access: 'public',
        default: '2026-10',
      }),
      SHOPIFY_STOREFRONT_PUBLIC_TOKEN: envField.string({
        context: 'server',
        access: 'public',
        optional: true,
      }),
      SHOPIFY_CUSTOMER_ACCOUNT_CLIENT_ID: envField.string({
        context: 'server',
        access: 'public',
        optional: true,
      }),
      SHOPIFY_SHOP_ID: envField.string({ context: 'server', access: 'public', optional: true }),
      MAIL_FROM: envField.string({ context: 'server', access: 'public', optional: true }),
      CLIENT_CARE_TO: envField.string({ context: 'server', access: 'public', optional: true }),
      SANITY_STUDIO_PROJECT_ID: envField.string({
        context: 'server',
        access: 'public',
        optional: true,
      }),
      SANITY_STUDIO_DATASET: envField.string({
        context: 'server',
        access: 'public',
        default: 'production',
      }),

      // Server secrets. Optional until each service is provisioned; callers must refuse a missing value.
      SANITY_READ_TOKEN: secret(),
      SANITY_WRITE_TOKEN: secret(),
      SANITY_REVALIDATE_SECRET: secret(),
      SHOPIFY_STOREFRONT_PRIVATE_TOKEN: secret(),
      SHOPIFY_WEBHOOK_SECRET: secret(),
      SHOPIFY_ADMIN_TOKEN: secret(),
      SESSION_SECRET: secret(),
      RESEND_API_KEY: secret(),
      TURNSTILE_SECRET_KEY: secret(),
      CRON_SECRET: secret(),
    },
  },
});
