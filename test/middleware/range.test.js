import { describe, it } from 'node:test';
import assert from 'node:assert';
import { rangeMiddleware } from '../../src/middleware/range.js';

describe('Range Middleware', () => {
  it('should pass through if no Range header', async (t) => {
    const req = { headers: {} };
    const nextCalled = [];
    const next = () => nextCalled.push(true);

    await rangeMiddleware()(req, {}, next);
    assert.strictEqual(nextCalled.length, 1);
    assert.strictEqual(req.rangeHeader, undefined);
  });

  it('should store Range header for later processing', async (t) => {
    const req = { headers: { range: 'bytes=0-1023' } };
    const nextCalled = [];
    const next = () => nextCalled.push(true);

    await rangeMiddleware()(req, {}, next);
    assert.strictEqual(nextCalled.length, 1);
    assert.strictEqual(req.rangeHeader, 'bytes=0-1023');
  });

  it('should handle Range header without end', async (t) => {
    const req = { headers: { range: 'bytes=100-' } };
    const nextCalled = [];
    const next = () => nextCalled.push(true);

    await rangeMiddleware()(req, {}, next);
    assert.strictEqual(nextCalled.length, 1);
    assert.strictEqual(req.rangeHeader, 'bytes=100-');
  });
});
