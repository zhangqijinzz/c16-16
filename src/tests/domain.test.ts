import { describe, expect, it } from 'vitest';
import { cropForRatio, getVariantRelation, isSameCrop, moveCrop, resizeCrop } from '../domain';
import { DEFAULT_CROP, type CropVariant } from '../model';

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

describe('variant relation', () => {
  const variantA: CropVariant = { id: 'a', x: 0.1, y: 0.1, width: 0.5, height: 0.4, ratio: 'free' };
  const variantB: CropVariant = { id: 'b', x: 0.1, y: 0.1, width: 0.5, height: 0.6, ratio: '1:1' };
  const current = (changes: Partial<CropVariant>): CropVariant => ({ ...variantA, id: 'current', ...changes });

  it('compares every crop field', () => {
    expect(isSameCrop(current({ height: 0.45 }), variantA)).toBe(false);
    expect(isSameCrop(current({ ratio: '1:1' }), variantA)).toBe(false);
    expect(isSameCrop(current({}), variantA)).toBe(true);
  });

  it('marks the active variant as modified after an edit', () => {
    expect(getVariantRelation({ crop: current({ x: 0.2 }), variants: [variantA, variantB], activeVariantId: 'a' }))
      .toEqual({ variantId: 'a', status: 'modified' });
  });

  it('prefers a full exact match over another active variant', () => {
    expect(getVariantRelation({ crop: current(variantB), variants: [variantA, variantB], activeVariantId: 'a' }))
      .toEqual({ variantId: 'b', status: 'exact' });
  });

  it('ignores an active id that is no longer saved', () => {
    expect(getVariantRelation({ crop: current({ x: 0.2 }), variants: [variantA], activeVariantId: 'missing' })).toBeNull();
  });
});
