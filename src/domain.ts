import type { CropVariant, FrameDocument, Ratio } from './model';

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

// 仅比对裁切几何信息，不包含 id（当前裁切框的 id 恒为 'current'）
export function isSameCrop(a: CropVariant, b: CropVariant): boolean {
  return a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height && a.ratio === b.ratio;
}

// 'exact' 当前裁切与某个已保存方案完全一致；'derived' 基于某个方案改动过；null 与任何方案都无关
export type CropMatchKind = 'exact' | 'derived';

export interface CropMatch {
  kind: CropMatchKind;
  variantId: string;
}

export function matchCrop(crop: CropVariant, variants: CropVariant[], originVariantId: string | null): CropMatch | null {
  const exact = variants.find((variant) => isSameCrop(crop, variant));
  if (exact) return { kind: 'exact', variantId: exact.id };
  if (originVariantId && variants.some((variant) => variant.id === originVariantId)) {
    return { kind: 'derived', variantId: originVariantId };
  }
  return null;
}

export function isFrameDocument(value: unknown): value is FrameDocument {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<FrameDocument>;
  return candidate.version === 1 && typeof candidate.guides === 'object' && candidate.crop !== undefined && Array.isArray(candidate.variants);
}

// 旧版本存档没有 originVariantId：几何完全相同的方案视为来源，使重开页面后的高亮与切换时一致
export function hydrateDocument(value: FrameDocument): FrameDocument {
  const origin = value.originVariantId ?? value.variants.find((variant) => isSameCrop(value.crop, variant))?.id ?? null;
  const originVariantId = origin !== null && value.variants.some((variant) => variant.id === origin) ? origin : null;
  return { ...value, originVariantId };
}
