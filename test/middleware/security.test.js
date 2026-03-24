import { describe, it } from 'node:test';
import assert from 'node:assert';
import { securityMiddleware } from '../../src/middleware/security.js';

describe('Security Middleware', () => {
  it('should allow valid paths', async (t) => {
    const req = { path: '/videos/video.mp4' };
    const res = {};
    const nextCalled = [];
    const next = () => nextCalled.push(true);

    await securityMiddleware(req, res, next);
    assert.strictEqual(nextCalled.length, 1);
  });

  it('should block path traversal attempts', async (t) => {
    const req = { path: '/videos/../etc/passwd' };
    const res = { status: () => res, send: () => res };
    const nextCalled = [];
    const next = () => nextCalled.push(true);

    await securityMiddleware(req, res, next);
    assert.strictEqual(nextCalled.length, 0);
  });

  it('should block absolute paths', async (t) => {
    const req = { path: '/etc/passwd' };
    const res = { status: () => res, send: () => res };
    const nextCalled = [];
    const next = () => nextCalled.push(true);

    await securityMiddleware(req, res, next);
    assert.strictEqual(nextCalled.length, 0);
  });
});
