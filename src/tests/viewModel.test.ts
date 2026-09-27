import { beforeEach, describe, expect, it } from 'vitest';
import { FrameSenseViewModel } from '../viewModel';
import { matchCrop } from '../domain';
import { DEFAULT_CROP, EMPTY_DOCUMENT, type CropVariant, type FrameDocument, type ImageAsset } from '../model';
import type { FrameRepository } from '../repository';
import type { ImageService } from '../service';

class MemoryRepository implements FrameRepository {
  document: FrameDocument = structuredClone(EMPTY_DOCUMENT);
  fail = false;
  load() { return structuredClone(this.document); }
  save(document: FrameDocument) { if (this.fail) throw new Error('no storage'); this.document = structuredClone(document); }
}

class FakeImageService implements ImageService {
  asset: ImageAsset = { src: 'data:image/svg+xml,test', width: 1200, height: 800, name: 'test.svg' };
  readFile() { return Promise.resolve(this.asset); }
  demo() { return this.asset; }
}

describe('FrameSenseViewModel', () => {
  let repository: MemoryRepository;
  let vm: FrameSenseViewModel;
  beforeEach(() => { repository = new MemoryRepository(); vm = new FrameSenseViewModel(repository, new FakeImageService()); });

  it('initializes empty and loads a demo image', async () => {
    await vm.initialize();
    expect(vm.getSnapshot().phase).toBe('ready');
    vm.loadDemo();
    expect(vm.getSnapshot().document.image?.name).toBe('test.svg');
    expect(repository.document.image).not.toBeNull();
  });

  it('updates guides, subject, ratio, and variants', () => {
    vm.loadDemo();
    vm.toggleGuide('center');
    vm.markSubject(0.2, 0.8);
    vm.setRatio('1:1');
    vm.saveVariant();
    expect(vm.getSnapshot().document.guides.center).toBe(true);
    expect(vm.getSnapshot().document.subject).toEqual({ x: 0.2, y: 0.8 });
    expect(vm.getSnapshot().document.crop.ratio).toBe('1:1');
    expect(vm.getSnapshot().document.variants).toHaveLength(1);
  });

  it('keeps edits in memory and reports persistence failure', () => {
    repository.fail = true;
    vm.loadDemo();
    expect(vm.getSnapshot().phase).toBe('error');
    expect(vm.getSnapshot().document.image).not.toBeNull();
    expect(vm.getSnapshot().error).toContain('本地保存失败');
  });

  it('highlights the exact variant after switching and keeps the origin after edits', () => {
    vm.loadDemo();
    const base: CropVariant = { id: 'variant-a', x: 0.1, y: 0.1, width: 0.5, height: 0.5, ratio: 'free' };
    const other: CropVariant = { id: 'variant-b', x: 0.1, y: 0.1, width: 0.8, height: 0.3, ratio: 'free' };
    repository.document = {
      ...repository.document,
      crop: { ...DEFAULT_CROP },
      variants: [base, other],
      originVariantId: null,
    };
    void vm.initialize();

    vm.selectVariant('variant-a');
    let doc = vm.getSnapshot().document;
    expect(doc.originVariantId).toBe('variant-a');
    expect(matchCrop(doc.crop, doc.variants, doc.originVariantId)).toEqual({ kind: 'exact', variantId: 'variant-a' });

    vm.moveCrop(0.05, 0.05);
    doc = vm.getSnapshot().document;
    expect(doc.crop.x).toBeCloseTo(0.15);
    expect(matchCrop(doc.crop, doc.variants, doc.originVariantId)).toEqual({ kind: 'derived', variantId: 'variant-a' });
  });

  it('treats a freshly saved variant as exact and restores the same highlight after reload', async () => {
    vm.loadDemo();
    vm.resizeCrop(0.6, 0.4);
    vm.saveVariant();
    const savedId = vm.getSnapshot().document.variants[0].id;
    expect(vm.getSnapshot().document.originVariantId).toBe(savedId);
    expect(matchCrop(vm.getSnapshot().document.crop, vm.getSnapshot().document.variants, savedId)).toEqual({ kind: 'exact', variantId: savedId });

    vm.moveCrop(0.04, 0);
    const reloaded = new FrameSenseViewModel(repository, new FakeImageService());
    await reloaded.initialize();
    const doc = reloaded.getSnapshot().document;
    expect(matchCrop(doc.crop, doc.variants, doc.originVariantId)).toEqual({ kind: 'derived', variantId: savedId });
  });
});
