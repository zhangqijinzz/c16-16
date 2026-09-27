import type { CropMatch } from '../domain';
import type { CropVariant, ImageAsset } from '../model';

interface VariantListProps {
  variants: CropVariant[];
  image: ImageAsset;
  match: CropMatch | null;
  onSave: () => void;
  onSelect: (id: string) => void;
}

export function VariantList({ variants, image, match, onSave, onSelect }: VariantListProps) {
  const cardClass = (variantId: string): string => {
    if (match?.kind === 'exact' && match.variantId === variantId) return 'variant-card selected';
    if (match?.kind === 'derived' && match.variantId === variantId) return 'variant-card derived';
    return 'variant-card';
  };

  return (
    <section className="variants-panel">
      <div className="panel-heading"><div><p className="eyebrow">SAVED FRAMES</p><h3>裁切方案 <span>{variants.length}</span></h3></div><button className="save-button" onClick={onSave}>保存当前</button></div>
      {variants.length === 0 ? <div className="variant-empty"><span>◇</span><p>还没有保存的方案</p><small>调整画框后保存，比较不同构图取舍。</small></div> : <div className="variant-list">{variants.map((variant, index) => {
        const exact = match?.kind === 'exact' && match.variantId === variant.id;
        const derived = match?.kind === 'derived' && match.variantId === variant.id;
        return <button className={cardClass(variant.id)} key={variant.id} onClick={() => onSelect(variant.id)} aria-pressed={exact}><span className="variant-thumb"><img src={image.src} alt="" style={{ objectPosition: `${variant.x * 100}% ${variant.y * 100}%` }} />{exact && <i className="variant-badge badge-current">当前</i>}{derived && <i className="variant-badge badge-derived">已改动</i>}</span><span><strong>方案 {String(index + 1).padStart(2, '0')}</strong><small>{variant.ratio === 'free' ? '自由裁切' : variant.ratio} · {Math.round(variant.width * 100)}% × {Math.round(variant.height * 100)}%</small>{exact && <small className="variant-state state-current">当前裁切与本方案完全一致</small>}{derived && <small className="variant-state state-derived">当前裁切除自本方案，已做修改</small>}</span><em>→</em></button>;
      })}</div>}
      <div className="variant-tip"><span>✦</span><p>建议保存至少 3 个版本：<br />保守、平衡、实验性。</p></div>
    </section>
  );
}
