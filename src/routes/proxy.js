import http from 'http';
import https from 'https';
import { URL } from 'url';

/**
 * 视频代理路由
 * 用于代理远程视频地址，解决跨域问题
 */
export function proxyRoute(config) {
  return async (req, res) => {
    try {
      const videoId = req.params.videoId;
      
      // 查找对应的远程视频配置
      const remoteVideo = (config.videos.remoteVideos || []).find(v => v.id === videoId);
      
      if (!remoteVideo) {
        return res.status(404).json({ 
          error: 'Video not found', 
          message: `No remote video configured with id: ${videoId}` 
        });
      }

      console.log(`Proxying video request: ${videoId} -> ${remoteVideo.url}`);

      // 转发请求到远程视频地址
      await proxyRequest(remoteVideo.url, req, res);
    } catch (error) {
      console.error('Proxy error:', error);
      // 只有在还没有发送响应时才发送错误信息
      if (!res.headersSent) {
        res.status(500).json({ 
          error: 'Proxy failed', 
          message: error.message 
        });
      }
    }
  };
}

/**
 * 代理 HTTP 请求
 */
function proxyRequest(targetUrl, req, res) {
  return new Promise((resolve, reject) => {
    const url = new URL(targetUrl);
    const isHttps = url.protocol === 'https:';
    const client = isHttps ? https : http;

    // 构建代理请求的 headers
    const headers = {};
    
    // 复制原始 headers,但排除一些可能导致问题的头
    for (const [key, value] of Object.entries(req.headers)) {
      // 跳过这些头,避免问题
      if (!['host', 'origin', 'referer', 'connection', 'keep-alive'].includes(key.toLowerCase())) {
        headers[key] = value;
      }
    }
    
    // 设置正确的 host
    headers.host = url.host;

    // 处理 Range 请求头
    if (req.headers.range) {
      headers.range = req.headers.range;
    }

    const options = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname + url.search,
      method: req.method,
      headers: headers,
      timeout: 30000, // 30秒超时
      rejectUnauthorized: false // 允许自签名证书(用于开发环境)
    };

    const proxyReq = client.request(options, (proxyRes) => {
      console.log(`Proxy response status: ${proxyRes.statusCode}`);

      // 设置响应头
      res.writeHead(proxyRes.statusCode, filterResponseHeaders(proxyRes.headers));

      // 管道数据
      proxyRes.pipe(res);

      proxyRes.on('end', () => {
        console.log('Proxy response ended');
        resolve();
      });

      proxyRes.on('error', (err) => {
        console.error('Proxy response error:', err);
        reject(err);
      });
    });

    proxyReq.on('error', (err) => {
      console.error('Proxy request error:', err);
      if (!res.headersSent) {
        res.status(502).json({ 
          error: 'Bad Gateway', 
          message: `Failed to connect to remote server: ${err.message}` 
        });
      }
      reject(err);
    });

    proxyReq.on('timeout', () => {
      console.error('Proxy request timeout');
      proxyReq.destroy();
      if (!res.headersSent) {
        res.status(504).json({ 
          error: 'Gateway Timeout', 
          message: 'Remote server did not respond in time' 
        });
      }
      reject(new Error('Request timeout'));
    });

    // 如果是 POST/PUT 等有 body 的请求，需要转发 body
    if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
      req.pipe(proxyReq);
    } else {
      proxyReq.end();
    }
  });
}

/**
 * 过滤响应头，移除可能导致问题的头
 */
function filterResponseHeaders(headers) {
  const filtered = { ...headers };
  
  // 移除这些头，由我们的服务器重新设置
  delete filtered['access-control-allow-origin'];
  delete filtered['access-control-allow-methods'];
  delete filtered['access-control-allow-headers'];
  delete filtered['access-control-expose-headers'];
  delete filtered['content-security-policy'];
  delete filtered['x-frame-options'];
  
  return filtered;
}
