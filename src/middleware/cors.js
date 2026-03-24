// 标准 CORS 中间件 - 用于处理跨域请求
export function corsMiddleware(options = {}) {
  const {
    origin = '*',
    methods = 'GET, HEAD, OPTIONS',
    allowedHeaders = 'Content-Type, Range',
    credentials = false
  } = options;

  return (req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', methods);
    res.setHeader('Access-Control-Allow-Headers', allowedHeaders);
    if (credentials) {
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    }

    console.log(`CORS headers set for ${req.method} ${req.path}`);

    // 处理预检请求
    if (req.method === 'OPTIONS') {
      res.status(204).end();
      return;
    }

    next();
  };
}

// 跨域隔离中间件 - 用于浏览器安全特性(COOP/COEP)
export function corsIsolationMiddleware(options = {}) {
  const { enabled = true, coop = 'same-origin', coep = 'require-corp' } = options;

  return (req, res, next) => {
    if (enabled && req.secure) {
      res.setHeader('Cross-Origin-Opener-Policy', coop);
      res.setHeader('Cross-Origin-Embedder-Policy', coep);
    }
    next();
  };
}
