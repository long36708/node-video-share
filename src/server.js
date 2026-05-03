import express from 'express';
import https from 'https';
import http from 'http';
import { WebSocketServer } from 'ws';
import { readFile, stat } from 'fs/promises';
import { existsSync } from 'fs';
import { lookup } from 'mime-types';
import { securityMiddleware } from './middleware/security.js';
import { corsMiddleware, corsIsolationMiddleware } from './middleware/cors.js';
import { rangeMiddleware } from './middleware/range.js';
import { videosRoute } from './routes/videos.js';
import { wsVideosRoute } from './routes/ws-videos.js';
import { proxyRoute } from './routes/proxy.js';
import { setupWebSocketVideoHandler } from './routes/websocket.js';
import { imagesRoute } from './routes/images.js';
import { createReadStream } from 'fs';

export class VideoServer {
  constructor(config) {
    this.config = config;
    this.app = express();
    this.server = null;
    this.wss = null;
    this.setupMiddleware();
    this.setupRoutes();
  }

  setupMiddleware() {
    // 请求日志 - 必须在最前面
    this.app.use((req, res, next) => {
      console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
      next();
    });

    // 标准 CORS 中间件 - 在所有其他中间件之前
    this.app.use(corsMiddleware({
      origin: '*',
      methods: 'GET, HEAD, OPTIONS',
      allowedHeaders: 'Content-Type, Range, LSize'
    }));

    // 跨域隔离中间件 - 仅在 HTTPS 下生效
    this.app.use(corsIsolationMiddleware({
      enabled: this.config.security.enableCorsIsolation,
      coop: this.config.security.coop,
      coep: this.config.security.coep
    }));

    this.app.use('/videos', securityMiddleware(this.config.videos.directory));

    this.app.use('/videos', rangeMiddleware());

    // 添加图片安全中间件
    this.app.use('/images', securityMiddleware(this.config.images.directory));
  }

  setupRoutes() {
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        protocol: req.secure ? 'https' : 'http'
      });
    });

    this.app.get('/videos.html', videosRoute(this.config));
    this.app.get('/ws-videos.html', wsVideosRoute(this.config));
    this.app.get('/images.html', imagesRoute(this.config));

    // 视频代理路由 - 用于解决跨域问题
    this.app.get('/proxy/:videoId', proxyRoute(this.config));

    this.app.get('/videos/*', async (req, res, next) => {
      try {
        const filePath = req.filePath;

        console.log(`Serving video: ${filePath}`);
        console.log(`Response headers before:`, res.getHeaders());

        if (!existsSync(filePath)) {
          console.error(`File not found: ${filePath}`);
          return res.status(404).json({ error: 'File not found', path: filePath });
        }

        const fileStats = await stat(filePath);
        console.log(`File stats: size=${fileStats.size}`);

        const contentType = lookup(filePath) || 'application/octet-stream';
        res.setHeader('Content-Type', contentType);
        res.setHeader('Accept-Ranges', 'bytes');

        // 处理 Range 请求
        if (req.rangeHeader) {
          const matches = req.rangeHeader.match(/bytes=(\d+)-(\d*)/);

          if (!matches) {
            return res.status(416).setHeader('Content-Range', `*/${fileStats.size}`).end();
          }

          const start = parseInt(matches[1], 10);
          let end = matches[2] ? parseInt(matches[2], 10) : fileStats.size - 1;

          // 验证 Range 参数
          if (start >= fileStats.size || start > end) {
            return res.status(416).setHeader('Content-Range', `*/${fileStats.size}`).end();
          }

          // 将 end 截断到文件实际范围内
          if (end >= fileStats.size) {
            end = fileStats.size - 1;
          }

          const contentLength = end - start + 1;
          console.log(`Range request: ${start}-${end}/${fileStats.size}`);

          res.status(206);
          res.setHeader('Content-Range', `bytes ${start}-${end}/${fileStats.size}`);
          res.setHeader('Content-Length', contentLength);

          const stream = createReadStream(filePath, { start, end });
          stream.pipe(res);
        } else {
          // 完整文件请求
          console.log(`Full file request`);
          res.setHeader('Content-Length', fileStats.size);
          const stream = createReadStream(filePath);
          stream.pipe(res);
        }
      } catch (error) {
        console.error('Error serving video:', error);
        console.error('Error stack:', error.stack);
        res.status(500).json({ error: 'Internal server error', message: error.message });
      }
    });

    // 图片文件服务路由
    this.app.get('/images/*', async (req, res) => {
      try {
        const filePath = req.filePath;

        console.log(`Serving image: ${filePath}`);

        if (!existsSync(filePath)) {
          console.error(`Image not found: ${filePath}`);
          return res.status(404).json({ error: 'Image not found', path: filePath });
        }

        const fileStats = await stat(filePath);

        const contentType = lookup(filePath) || 'application/octet-stream';
        res.setHeader('Content-Type', contentType);
        
        // 设置强缓存（30天）
        res.setHeader('Cache-Control', 'public, max-age=2592000');
        res.setHeader('Content-Length', fileStats.size);
        
        // 添加 CORS 头以支持跨域隔离
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');

        const stream = createReadStream(filePath);
        stream.pipe(res);
      } catch (error) {
        console.error('Error serving image:', error);
        res.status(500).json({ error: 'Internal server error', message: error.message });
      }
    });

    this.app.use((req, res) => {
      res.status(404).json({ error: 'Not found' });
    });

    this.app.use((err, req, res, next) => {
      console.error('Error:', err);
      res.status(500).json({ error: 'Internal server error' });
    });
  }

  async start() {
    const port = this.config.server.port;
    const httpsConfig = this.config.server.https;

    return new Promise((resolve, reject) => {
      if (httpsConfig.enabled) {
        if (!existsSync(httpsConfig.key) || !existsSync(httpsConfig.cert)) {
          console.warn('HTTPS certificates not found, falling back to HTTP');
          this.server = http.createServer(this.app);
        } else {
          Promise.all([
            readFile(httpsConfig.key),
            readFile(httpsConfig.cert)
          ]).then(([key, cert]) => {
            this.server = https.createServer({ key, cert }, this.app);
            this.listen(port, resolve, reject);
          }).catch(reject);
          return;
        }
      } else {
        this.server = http.createServer(this.app);
      }

      this.listen(port, resolve, reject);
    });
  }

  listen(port, resolve, reject) {
    this.server.listen(port, (err) => {
      if (err) {
        reject(err);
      } else {
        console.log(`Server listening on port ${port}`);
        
        // 初始化WebSocket服务器
        this.wss = new WebSocketServer({ server: this.server });
        setupWebSocketVideoHandler(this.wss, this.config);
        console.log('WebSocket server initialized');
        
        resolve();
      }
    });
  }

  stop() {
    return new Promise((resolve) => {
      if (this.wss) {
        this.wss.close(() => {
          console.log('WebSocket server stopped');
        });
      }
      
      if (this.server) {
        this.server.close(() => {
          console.log('Server stopped');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }
}
