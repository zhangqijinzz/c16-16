import { describe, expect, it } from 'vitest';
import { cropForRatio, hydrateDocument, isSameCrop, matchCrop, moveCrop, resizeCrop } from '../domain';
import { DEFAULT_CROP, EMPTY_DOCUMENT, type CropVariant } from '../model';

describe('crop domain rules', () => {
  it('fits a 1:1 crop inside a wide image and centers it', () => {
    const crop = cropForRatio('1:1', 1.5, DEFAULT_CROP);
    expect(crop.width).toBeCloseTo(2 / 3);
    expect(crop.height).toBe(1);
    expect(crop.x).toBeCloseTo(1 / 6);
  });

  it('clamps movement to the image boundary', () => {
    const crop = moveCrop({ ...DEFAULT_CROP, width: 0.5, height: 0.5 }, 0.9, -0.9);
    expect(crop.x).toBe(0.5);
    expect(crop.y).toBe(0);
  });

  it('keeps a selected ratio while resizing', () => {
    const crop = resizeCrop({ ...DEFAULT_CROP, ratio: '16:9', width: 0.5, height: 0.28125 }, 0.8, 0.8);
    expect(crop.width).toBe(0.8);
    expect(crop.height).toBeCloseTo(0.45);
  });
});

describe('variant crop matching', () => {
  const variant: CropVariant = { id: 'v1', x: 0.1, y: 0.2, width: 0.5, height: 0.4, ratio: 'free' };
  const close: CropVariant = { id: 'v2', x: 0.1, y: 0.2, width: 0.5, height: 0.9, ratio: 'free' };

  it('compares every crop field including height and ratio', () => {
    expect(isSameCrop({ ...variant, id: 'current' }, variant)).toBe(true);
    expect(isSameCrop({ ...variant, id: 'current' }, close)).toBe(false);
    expect(isSameCrop({ ...variant, id: 'current', ratio: '4:5' }, variant)).toBe(false);
    expect(isSameCrop({ ...variant, id: 'current', x: 0.11 }, variant)).toBe(false);
  });

  it('marks an exact match even without a recorded origin', () => {
    expect(matchCrop({ ...variant, id: 'current' }, [variant, close], null)).toEqual({ kind: 'exact', variantId: 'v1' });
  });

  it('marks a modified crop as derived from its recorded origin', () => {
    const edited = { ...variant, id: 'current', x: 0.3 };
    expect(matchCrop(edited, [variant, close], 'v1')).toEqual({ kind: 'derived', variantId: 'v1' });
  });

  it('prefers an exact match over a stale origin, and reports nothing when unrelated', () => {
    const edited = { ...close, id: 'current' };
    expect(matchCrop(edited, [variant, close], 'v1')).toEqual({ kind: 'exact', variantId: 'v2' });
    expect(matchCrop(edited, [variant], 'missing-id')).toBeNull();
    expect(matchCrop({ ...variant, id: 'current', width: 0.2 }, [variant, close], null)).toBeNull();
  });

  it('hydrates legacy documents by deriving origin from identical geometry', () => {
    const legacy = { ...structuredClone(EMPTY_DOCUMENT), originVariantId: undefined as unknown, crop: { ...variant, id: 'current' }, variants: [variant, close] };
    expect(hydrateDocument(legacy as never).originVariantId).toBe('v1');
    const unrelated = { ...structuredClone(EMPTY_DOCUMENT), originVariantId: undefined as unknown, crop: { ...variant, id: 'current', width: 0.2 }, variants: [variant, close] };
    expect(hydrateDocument(unrelated as never).originVariantId).toBeNull();
    const dangling = { ...structuredClone(EMPTY_DOCUMENT), originVariantId: 'gone', crop: { ...variant, id: 'current', width: 0.2 }, variants: [variant, close] };
    expect(hydrateDocument(dangling).originVariantId).toBeNull();
  });
});
