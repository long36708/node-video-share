import { describe, it } from 'node:test';
import assert from 'node:assert';
import { corsMiddleware, corsIsolationMiddleware } from '../../src/middleware/cors.js';

describe('CORS Middleware', () => {
  it('should set Access-Control-Allow-Origin header', async (t) => {
    const req = {};
    const headers = {};
    const res = {
      setHeader: (name, value) => { headers[name] = value; }
    };
    const nextCalled = [];
    const next = () => nextCalled.push(true);

    await corsMiddleware({ origin: '*' })(req, res, next);
    assert.strictEqual(nextCalled.length, 1);
    assert.strictEqual(headers['Access-Control-Allow-Origin'], '*');
  });

  it('should set Access-Control-Allow-Methods header', async (t) => {
    const req = {};
    const headers = {};
    const res = {
      setHeader: (name, value) => { headers[name] = value; }
    };
    const nextCalled = [];
    const next = () => nextCalled.push(true);

    await corsMiddleware({ methods: 'GET, POST' })(req, res, next);
    assert.strictEqual(nextCalled.length, 1);
    assert.strictEqual(headers['Access-Control-Allow-Methods'], 'GET, POST');
  });

  it('should handle OPTIONS preflight request', async (t) => {
    const req = { method: 'OPTIONS' };
    const headers = {};
    const res = {
      setHeader: (name, value) => { headers[name] = value; },
      status: (code) => {
        res.statusCode = code;
        return res;
      },
      end: () => {}
    };
    const nextCalled = [];
    const next = () => nextCalled.push(true);

    await corsMiddleware()(req, res, next);
    assert.strictEqual(res.statusCode, 204);
    assert.strictEqual(nextCalled.length, 0);
  });
});

describe('CORS Isolation Middleware', () => {
  it('should add COOP and COEP headers when HTTPS', async (t) => {
    const req = { secure: true };
    const headers = {};
    const res = {
      setHeader: (name, value) => { headers[name] = value; }
    };
    const nextCalled = [];
    const next = () => nextCalled.push(true);

    await corsIsolationMiddleware({
      enabled: true,
      coop: 'same-origin',
      coep: 'require-corp'
    })(req, res, next);
    assert.strictEqual(nextCalled.length, 1);
    assert.strictEqual(headers['Cross-Origin-Opener-Policy'], 'same-origin');
    assert.strictEqual(headers['Cross-Origin-Embedder-Policy'], 'require-corp');
  });

  it('should not add headers when not HTTPS', async (t) => {
    const req = { secure: false };
    const headers = {};
    const res = {
      setHeader: (name, value) => { headers[name] = value; }
    };
    const nextCalled = [];
    const next = () => nextCalled.push(true);

    await corsIsolationMiddleware({
      enabled: true,
      coop: 'same-origin',
      coep: 'require-corp'
    })(req, res, next);
    assert.strictEqual(nextCalled.length, 1);
    assert.strictEqual(headers['Cross-Origin-Opener-Policy'], undefined);
    assert.strictEqual(headers['Cross-Origin-Embedder-Policy'], undefined);
  });

  it('should not add headers when disabled', async (t) => {
    const req = { secure: true };
    const headers = {};
    const res = {
      setHeader: (name, value) => { headers[name] = value; }
    };
    const nextCalled = [];
    const next = () => nextCalled.push(true);

    await corsIsolationMiddleware({ enabled: false })(req, res, next);
    assert.strictEqual(nextCalled.length, 1);
    assert.strictEqual(headers['Cross-Origin-Opener-Policy'], undefined);
    assert.strictEqual(headers['Cross-Origin-Embedder-Policy'], undefined);
  });
});
