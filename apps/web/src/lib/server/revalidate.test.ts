import { describe, expect, it } from 'vitest';
import { FULL_SITE_PATHS, pathsForSanityDoc } from './revalidate';

describe('pathsForSanityDoc', () => {
  it('honours explicit paths', async () => {
    await expect(pathsForSanityDoc({ paths: ['/a', '/b'] })).resolves.toEqual(['/a', '/b']);
  });

  it('maps singletons to the full site set', async () => {
    const paths = await pathsForSanityDoc({ _type: 'homePage', _id: 'homePage' });
    expect(paths).toEqual(FULL_SITE_PATHS);
  });

  it('maps piece / drop / category / info by slug', async () => {
    expect(await pathsForSanityDoc({ _type: 'piece', slug: 'cap' })).toEqual(
      expect.arrayContaining(['/pieces/cap', '/pieces', '/']),
    );
    expect(await pathsForSanityDoc({ _type: 'drop', slug: 'style-001' })).toEqual(
      expect.arrayContaining(['/drops/style-001', '/', '/pieces']),
    );
    expect(await pathsForSanityDoc({ _type: 'category', slug: 'tees' })).toEqual([
      '/categories/tees',
    ]);
    expect(await pathsForSanityDoc({ _type: 'infoPage', slug: 'privacy' })).toEqual([
      '/client-care/privacy',
      '/legal/privacy',
    ]);
  });

  it('ignores private Sanity types', async () => {
    expect(await pathsForSanityDoc({ _type: 'formSubmission', _id: 'x' })).toEqual([]);
  });
});
