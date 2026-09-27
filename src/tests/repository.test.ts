import { describe, expect, it } from 'vitest';
import { LocalFrameRepository } from '../repository';
import { EMPTY_DOCUMENT } from '../model';
import type { StorageService } from '../service';

class MemoryStorage implements StorageService {
  value: string | null = null;
  read() { return this.value; }
  write(value: string) { this.value = value; }
}

describe('LocalFrameRepository', () => {
  it('saves and reloads the versioned document', () => {
    const storage = new MemoryStorage();
    const repository = new LocalFrameRepository(storage);
    const document = { ...structuredClone(EMPTY_DOCUMENT), subject: { x: 0.4, y: 0.6 } };
    repository.save(document);
    expect(repository.load().subject).toEqual({ x: 0.4, y: 0.6 });
  });

  it('falls back to a usable empty document for damaged data', () => {
    const storage = new MemoryStorage();
    storage.value = '{ damaged';
    const document = new LocalFrameRepository(storage).load();
    expect(document.version).toBe(1);
    expect(document.image).toBeNull();
    expect(document.variants).toEqual([]);
  });

  it('rebuilds the origin highlight for legacy documents without originVariantId', () => {
    const storage = new MemoryStorage();
    const variant = { id: 'variant-1', x: 0.2, y: 0.1, width: 0.5, height: 0.6, ratio: 'free' };
    storage.value = JSON.stringify({
      ...structuredClone(EMPTY_DOCUMENT),
      crop: { ...variant, id: 'current' },
      variants: [variant],
    });
    expect(new LocalFrameRepository(storage).load().originVariantId).toBe('variant-1');
  });
});
