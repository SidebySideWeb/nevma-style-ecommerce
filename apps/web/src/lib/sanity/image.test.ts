import { describe, expect, it } from 'vitest';
import {
  TONE_BG,
  TONE_FG,
  hasPhotoImage,
  imgStyle,
  objectPositionFrom,
  photoTone,
  placeholderLabel,
  resolvePhoto,
  slots,
} from './image';
import type { Photo } from './types';

describe('image helper', () => {
  it('maps tones to design colours', () => {
    expect(TONE_BG.black).toBe('#000000');
    expect(TONE_BG.ink).toBe('#0B0B0C');
    expect(TONE_BG.ink2).toBe('#141418');
    expect(TONE_BG.bone).toBe('#D9D3C8');
    expect(TONE_FG.bone).toBe('#615D55');
    expect(TONE_FG.ink).toBe('#A8A8B4');
    expect(photoTone({ tone: 'ink2' })).toBe('ink2');
    expect(photoTone(null)).toBe('bone');
  });

  it('builds placeholder labels like the design', () => {
    expect(placeholderLabel({ placeholder: 'worn, on model' })).toBe('[Photo · worn, on model]');
    expect(placeholderLabel({ placeholder: 'Suede Cap · front' })).toBe(
      '[Photo · Suede Cap · front]',
    );
    expect(placeholderLabel({})).toBe('[Photo]');
  });

  it('prefers explicit position over hotspot', () => {
    expect(objectPositionFrom('center 42%', { x: 0.2, y: 0.8 })).toBe('center 42%');
    expect(objectPositionFrom(null, { x: 0.25, y: 0.5 })).toBe('25% 50%');
    expect(objectPositionFrom(undefined, undefined)).toBeUndefined();
  });

  it('detects whether a photo has an image asset', () => {
    expect(hasPhotoImage({ placeholder: 'cap', tone: 'black' })).toBe(false);
    expect(
      hasPhotoImage({
        alt: 'Cap',
        image: { asset: { _id: 'image-abc-1000x1250-jpg' } },
      }),
    ).toBe(true);
  });

  it('resolves width/height/srcset/sizes and object-position from a raw asset URL', () => {
    const photo: Photo = {
      alt: 'Definition Tee',
      position: 'center 40%',
      image: {
        asset: {
          url: 'https://cdn.sanity.io/images/proj/production/abc.jpg',
          metadata: { dimensions: { width: 2000, height: 2500 } },
        },
      },
    };
    const resolved = resolvePhoto(photo, slots.card);
    expect(resolved).not.toBeNull();
    expect(resolved!.alt).toBe('Definition Tee');
    expect(resolved!.objectPosition).toBe('center 40%');
    expect(resolved!.width).toBe(2000);
    expect(resolved!.height).toBe(2500);
    expect(resolved!.sizes).toBe(slots.card.sizes);
    expect(resolved!.src).toContain('abc.jpg');
    expect(resolved!.srcset).toContain('640w');
  });

  it('uses hotspot for object-position when position is empty', () => {
    const photo: Photo = {
      alt: '',
      image: {
        asset: {
          url: 'https://cdn.sanity.io/images/proj/production/x.jpg',
          metadata: { dimensions: { width: 1000, height: 1000 } },
        },
        hotspot: { x: 0.42, y: 0.18 },
      },
    };
    const resolved = resolvePhoto(photo, slots.gallery);
    expect(resolved!.objectPosition).toBe('42% 18%');
  });

  it('merges object-position and zoom into img style', () => {
    expect(
      imgStyle('width: 100%; height: 100%; object-fit: cover; display: block', {
        objectPosition: 'center 42%',
        zoom: 1,
      }),
    ).toBe(
      'width: 100%; height: 100%; object-fit: cover; display: block; object-position: center 42%',
    );
    expect(
      imgStyle(undefined, { objectPosition: undefined, zoom: 1.9 }),
    ).toBe('transform: scale(1.9); transform-origin: 50% 45%');
  });

  it('returns null when the photo is only a placeholder', () => {
    expect(resolvePhoto({ placeholder: 'overshirt', tone: 'black' }, slots.card)).toBeNull();
  });
});
