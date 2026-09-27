import { beforeEach, describe, expect, it } from 'vitest';
import { getVariantRelation } from '../domain';
import { FrameSenseViewModel } from '../viewModel';
import { EMPTY_DOCUMENT, type FrameDocument, type ImageAsset } from '../model';
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

  it('keeps a modified variant linked to its source after editing', () => {
    vm.loadDemo();
    vm.setRatio('1:1');
    vm.saveVariant();
    const variantId = vm.getSnapshot().document.variants[0].id;
    vm.moveCrop(0.05, 0.02);

    const document = vm.getSnapshot().document;
    expect(document.activeVariantId).toBe(variantId);
    expect(getVariantRelation(document)).toEqual({ variantId, status: 'modified' });
  });

  it('restores the same variant relation after reopening', async () => {
    vm.loadDemo();
    vm.setRatio('1:1');
    vm.saveVariant();
    const variantId = vm.getSnapshot().document.variants[0].id;
    vm.moveCrop(0.05, 0.02);

    const reopened = new FrameSenseViewModel(repository, new FakeImageService());
    await reopened.initialize();
    expect(reopened.getSnapshot().document.activeVariantId).toBe(variantId);
    expect(getVariantRelation(reopened.getSnapshot().document)).toEqual({ variantId, status: 'modified' });
  });

  it('marks a saved variant as the exact current version', () => {
    vm.loadDemo();
    vm.setRatio('1:1');
    vm.saveVariant();
    const variantId = vm.getSnapshot().document.variants[0].id;
    expect(getVariantRelation(vm.getSnapshot().document)).toEqual({ variantId, status: 'exact' });
  });

  it('keeps edits in memory and reports persistence failure', () => {
    repository.fail = true;
    vm.loadDemo();
    expect(vm.getSnapshot().phase).toBe('error');
    expect(vm.getSnapshot().document.image).not.toBeNull();
    expect(vm.getSnapshot().error).toContain('本地保存失败');
  });
});
