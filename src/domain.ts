import type { CropVariant, FrameDocument, Ratio, VariantRelation } from './model';

const clamp = (value: number, min = 0, max = 1): number => Math.min(max, Math.max(min, value));

export function normalizeCrop(crop: CropVariant): CropVariant {
  const width = clamp(crop.width, 0.12, 1);
  const height = clamp(crop.height, 0.12, 1);
  return {
    ...crop,
    x: clamp(crop.x, 0, 1 - width),
    y: clamp(crop.y, 0, 1 - height),
    width,
    height,
  };
}

export function cropForRatio(ratio: Ratio, imageRatio: number, current: CropVariant): CropVariant {
  if (ratio === 'free') return { ...current, ratio };
  const [w, h] = ratio.split(':').map(Number);
  const target = w / h;
  let width = 1;
  let height = 1;
  if (target > imageRatio) height = Math.min(1, imageRatio / target);
  else width = Math.min(1, target / imageRatio);
  return normalizeCrop({
    ...current,
    ratio,
    width,
    height,
    x: (1 - width) / 2,
    y: (1 - height) / 2,
  });
}

export function moveCrop(crop: CropVariant, dx: number, dy: number): CropVariant {
  return normalizeCrop({ ...crop, x: crop.x + dx, y: crop.y + dy });
}

export function resizeCrop(crop: CropVariant, width: number, height: number): CropVariant {
  const nextWidth = width;
  let nextHeight = height;
  if (crop.ratio !== 'free') {
    const [w, h] = crop.ratio.split(':').map(Number);
    nextHeight = nextWidth / (w / h);
  }
  return normalizeCrop({ ...crop, width: nextWidth, height: nextHeight });
}

export function makeVariant(crop: CropVariant, id: string): CropVariant {
  return { ...normalizeCrop(crop), id };
}

export function isSameCrop(a: CropVariant, b: CropVariant): boolean {
  return a.x === b.x
    && a.y === b.y
    && a.width === b.width
    && a.height === b.height
    && a.ratio === b.ratio;
}

export function getVariantRelation(document: Pick<FrameDocument, 'crop' | 'variants' | 'activeVariantId'>): VariantRelation | null {
  const activeVariant = document.variants.find((variant) => variant.id === document.activeVariantId);
  if (activeVariant && isSameCrop(document.crop, activeVariant)) {
    return { variantId: activeVariant.id, status: 'exact' };
  }

  const exactVariant = document.variants.find((variant) => isSameCrop(document.crop, variant));
  if (exactVariant) return { variantId: exactVariant.id, status: 'exact' };

  return activeVariant ? { variantId: activeVariant.id, status: 'modified' } : null;
}

export function isFrameDocument(value: unknown): value is FrameDocument {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<FrameDocument>;
  return candidate.version === 1
    && typeof candidate.guides === 'object'
    && candidate.crop !== undefined
    && Array.isArray(candidate.variants)
    && (candidate.activeVariantId === undefined
      || candidate.activeVariantId === null
      || typeof candidate.activeVariantId === 'string');
}
