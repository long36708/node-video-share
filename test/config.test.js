import { describe, it } from 'node:test';
import assert from 'node:assert';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { loadConfig } from '../src/config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('Config Manager', () => {
  it('should load config from file', async () => {
    const config = await loadConfig(join(__dirname, '../config.json'));
    assert.strictEqual(config.server.port, 3000);
    assert.strictEqual(config.videos.directory, './videos');
  });

  it('should provide default values', async () => {
    const config = await loadConfig(join(__dirname, '../config.json'));
    assert.strictEqual(config.security.enableCorsIsolation, true);
    assert.strictEqual(config.security.coop, 'same-origin');
    assert.strictEqual(config.security.coep, 'require-corp');
  });

  it('should include allowed video extensions', async () => {
    const config = await loadConfig(join(__dirname, '../config.json'));
    assert(Array.isArray(config.videos.allowedExtensions));
    assert.ok(config.videos.allowedExtensions.includes('.mp4'));
  });
});
