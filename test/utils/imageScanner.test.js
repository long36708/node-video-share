import { describe, it } from 'node:test';
import assert from 'node:assert';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { scanImages } from '../../src/utils/imageScanner.js';

describe('scanImages', () => {
  const testDir = join(process.cwd(), 'test-temp-images');

  it('should return empty array for empty directory', async () => {
    await mkdir(testDir, { recursive: true });
    try {
      const images = await scanImages(testDir, 'http://localhost:3000', ['.jpg', '.png']);
      assert.strictEqual(images.length, 0);
    } finally {
      await rm(testDir, { recursive: true, force: true });
    }
  });

  it('should scan images in subdirectories', async () => {
    const subDir = join(testDir, 'subdir');
    await mkdir(subDir, { recursive: true });
    await writeFile(join(subDir, 'test.jpg'), 'fake image content');
    
    try {
      const images = await scanImages(testDir, 'http://localhost:3000', ['.jpg']);
      assert.strictEqual(images.length, 1);
      assert.strictEqual(images[0].name, 'test.jpg');
      assert.ok(images[0].relativePath.includes('subdir'));
    } finally {
      await rm(testDir, { recursive: true, force: true });
    }
  });

  it('should filter by allowed extensions', async () => {
    await mkdir(testDir, { recursive: true });
    await writeFile(join(testDir, 'photo.jpg'), 'content');
    await writeFile(join(testDir, 'document.pdf'), 'content');
    
    try {
      const images = await scanImages(testDir, 'http://localhost:3000', ['.jpg', '.png']);
      assert.strictEqual(images.length, 1);
      assert.strictEqual(images[0].name, 'photo.jpg');
    } finally {
      await rm(testDir, { recursive: true, force: true });
    }
  });

  it('should skip hidden files', async () => {
    await mkdir(testDir, { recursive: true });
    await writeFile(join(testDir, '.hidden.jpg'), 'content');
    await writeFile(join(testDir, 'visible.jpg'), 'content');
    
    try {
      const images = await scanImages(testDir, 'http://localhost:3000', ['.jpg']);
      assert.strictEqual(images.length, 1);
      assert.strictEqual(images[0].name, 'visible.jpg');
    } finally {
      await rm(testDir, { recursive: true, force: true });
    }
  });
});
