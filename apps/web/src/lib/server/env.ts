/** Server env reads that work in Astro SSR and in vitest (no astro:env). */

export function serverEnv(name: string): string | undefined {
  return process.env[name];
}

export function isCommerceMock(): boolean {
  return serverEnv('COMMERCE_MOCK') === '1';
}

export function assertServerOnly(module: string): void {
  if (typeof window !== 'undefined') {
    throw new Error(`${module} is server-only`);
  }
}
