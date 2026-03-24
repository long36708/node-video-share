import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { mkdir, writeFile, rm } from 'fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { scanVideos } from '../../src/utils/videoScanner.js';

describe('Video Scanner', () => {
  let testDir;

  before(async () => {
    testDir = join(tmpdir(), 'video-scan-test-' + Date.now());
    await mkdir(testDir, { recursive: true });
    await mkdir(join(testDir, 'subfolder'), { recursive: true });
    await writeFile(join(testDir, 'video1.mp4'), 'fake video content');
    await writeFile(join(testDir, 'video2.webm'), 'fake video content');
    await writeFile(join(testDir, 'not-video.txt'), 'not a video');
    await writeFile(join(testDir, 'subfolder', 'video3.mp4'), 'fake video content');
  });

  after(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it('should scan and find video files', async () => {
    const videos = await scanVideos(testDir);
    assert.strictEqual(videos.length, 3);
    assert.ok(videos.find(v => v.name === 'video1.mp4'));
    assert.ok(videos.find(v => v.name === 'video2.webm'));
    assert.ok(videos.find(v => v.name === 'video3.mp4'));
  });

  it('should filter non-video files', async () => {
    const videos = await scanVideos(testDir);
    assert.ok(!videos.find(v => v.name === 'not-video.txt'));
  });

  it('should include relative path', async () => {
    const videos = await scanVideos(testDir);
    const subfolderVideo = videos.find(v => v.name === 'video3.mp4');
    assert.strictEqual(subfolderVideo.relativePath, 'subfolder/video3.mp4');
  });

  it('should generate full URL', async () => {
    const baseUrl = 'http://localhost:3000';
    const videos = await scanVideos(testDir, baseUrl);
    const video1 = videos.find(v => v.name === 'video1.mp4');
    assert.strictEqual(video1.url, `${baseUrl}/videos/video1.mp4`);
  });
});
