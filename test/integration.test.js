import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { mkdir, writeFile, rm } from 'fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { VideoServer } from '../src/server.js';

describe('Integration Tests', () => {
  let server;
  let testDir;
  let port = 3456;

  before(async () => {
    testDir = join(tmpdir(), 'video-share-test-' + Date.now());
    await mkdir(testDir, { recursive: true });
    await mkdir(join(testDir, 'subfolder'), { recursive: true });
    await writeFile(join(testDir, 'test1.mp4'), 'fake video content');
    await writeFile(join(testDir, 'subfolder', 'test2.mp4'), 'fake video content');

    const config = {
      server: { port, https: { enabled: false, key: '', cert: '' } },
      videos: { directory: testDir, allowedExtensions: ['.mp4'] },
      security: { enableCorsIsolation: true, coop: 'same-origin', coep: 'require-corp' }
    };

    server = new VideoServer(config);
    await server.start();
  });

  after(async () => {
    await server.stop();
    await rm(testDir, { recursive: true, force: true });
  });

  it('should respond to health check', async () => {
    const response = await fetch(`http://localhost:${port}/health`);
    const data = await response.json();
    assert.strictEqual(response.status, 200);
    assert.strictEqual(data.status, 'ok');
  });

  it('should serve video list page', async () => {
    const response = await fetch(`http://localhost:${port}/videos.html`);
    const html = await response.text();
    assert.strictEqual(response.status, 200);
    assert.ok(html.includes('test1.mp4'));
    assert.ok(html.includes('test2.mp4'));
  });
});
