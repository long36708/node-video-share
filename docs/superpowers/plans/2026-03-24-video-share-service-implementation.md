# 视频共享服务实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建一个轻量级的Node.js视频共享服务,支持HTTP/HTTPS协议、跨域隔离、Range请求和视频链接快速访问功能。

**Architecture:** 基于Express.js的模块化架构,包含配置管理、中间件链(安全、跨域隔离、Range处理)、视频扫描器和视频列表页面。采用流式传输优化性能,控制台输出和网页列表提供快速链接访问。

**Tech Stack:** Node.js, Express.js, mime-types, chalk, fs/promises, path

---

## 文件结构

```
node-video-share/
├── config.json                    # 配置文件
├── package.json                   # 依赖管理
├── src/
│   ├── config.js                  # 配置管理器
│   ├── server.js                  # 服务器核心
│   ├── index.js                   # 启动入口
│   ├── routes/
│   │   └── videos.js              # 视频列表页面路由
│   ├── utils/
│   │   └── videoScanner.js        # 视频扫描工具
│   └── middleware/
│       ├── range.js               # Range请求中间件
│       ├── cors.js                # 跨域隔离中间件
│       └── security.js             # 安全中间件
├── videos/                        # 默认视频目录
└── README.md                      # 使用说明
```

---

## Task 1: 项目初始化

**Files:**
- Create: `package.json`
- Create: `config.json`
- Create: `README.md`

- [ ] **Step 1: 创建 package.json**

```json
{
  "name": "node-video-share",
  "version": "1.0.0",
  "description": "A lightweight video sharing service for local development",
  "main": "src/index.js",
  "type": "module",
  "scripts": {
    "start": "node src/index.js",
    "test": "node --test"
  },
  "keywords": ["video", "share", "http", "https"],
  "author": "",
  "license": "MIT",
  "dependencies": {
    "express": "^4.18.2",
    "mime-types": "^2.1.35",
    "chalk": "^5.3.0"
  }
}
```

- [ ] **Step 2: 创建默认配置文件 config.json**

```json
{
  "server": {
    "port": 3000,
    "https": {
      "enabled": false,
      "key": "./key.pem",
      "cert": "./cert.pem"
    }
  },
  "videos": {
    "directory": "./videos",
    "allowedExtensions": [".mp4", ".webm", ".ogg", ".mov", ".avi", ".mkv", ".flv", ".wmv"]
  },
  "security": {
    "enableCorsIsolation": true,
    "coop": "same-origin",
    "coep": "require-corp"
  }
}
```

- [ ] **Step 3: 创建 README.md**

```markdown
# Node Video Share

A lightweight video sharing service for local development/testing.

## Features

- HTTP/HTTPS support with automatic cross-origin isolation
- Range requests for optimized video streaming
- Quick video link access via console output and web page
- Secure path handling to prevent directory traversal

## Installation

```bash
npm install
```

## Usage

```bash
npm start
```

Access videos at: `http://localhost:3000/videos/yourvideo.mp4`
View video list at: `http://localhost:3000/videos.html`

## Configuration

Edit `config.json` to customize port, HTTPS settings, and video directory.
```

- [ ] **Step 4: 初始化项目并安装依赖**

Run: `npm install`
Expected: node_modules directory created with express, mime-types, chalk

- [ ] **Step 5: 提交**

```bash
git add package.json config.json README.md
git commit -m "feat: initialize project with package.json and config"
```

---

## Task 2: 配置管理器

**Files:**
- Create: `src/config.js`
- Test: `test/config.test.js`

- [ ] **Step 1: 编写配置管理器测试**

Create: `test/config.test.js`

```javascript
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { loadConfig } from '../src/config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('Config Manager', () => {
  it('should load config from file', async () => {
    const config = await loadConfig(join(__dirname, '../config.json5'));
    assert.strictEqual(config.server.port, 3000);
    assert.strictEqual(config.videos.directory, './videos');
  });

  it('should provide default values', async () => {
    const config = await loadConfig(join(__dirname, '../config.json5'));
    assert.strictEqual(config.security.enableCorsIsolation, true);
    assert.strictEqual(config.security.coop, 'same-origin');
    assert.strictEqual(config.security.coep, 'require-corp');
  });

  it('should include allowed video extensions', async () => {
    const config = await loadConfig(join(__dirname, '../config.json5'));
    assert(Array.isArray(config.videos.allowedExtensions));
    assert.ok(config.videos.allowedExtensions.includes('.mp4'));
  });
});
```

- [ ] **Step 2: 运行测试验证失败**

Run: `npm test`
Expected: FAIL with "Cannot find module '../src/config.js'"

- [ ] **Step 3: 实现配置管理器**

Create: `src/config.js`

```javascript
import { readFile } from 'fs/promises';
import { resolve } from 'path';

const DEFAULT_CONFIG = {
  server: {
    port: 3000,
    https: {
      enabled: false,
      key: './key.pem',
      cert: './cert.pem'
    }
  },
  videos: {
    directory: './videos',
    allowedExtensions: ['.mp4', '.webm', '.ogg', '.mov', '.avi', '.mkv', '.flv', '.wmv']
  },
  security: {
    enableCorsIsolation: true,
    coop: 'same-origin',
    coep: 'require-corp'
  }
};

export async function loadConfig(configPath) {
  try {
    const content = await readFile(configPath, 'utf-8');
    const userConfig = JSON.parse(content);
    return mergeConfig(DEFAULT_CONFIG, userConfig);
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.warn(`Config file not found at ${configPath}, using defaults`);
      return DEFAULT_CONFIG;
    }
    throw error;
  }
}

function mergeConfig(defaults, userConfig) {
  return {
    server: { ...defaults.server, ...userConfig.server },
    videos: { ...defaults.videos, ...userConfig.videos },
    security: { ...defaults.security, ...userConfig.security }
  };
}
```

- [ ] **Step 4: 运行测试验证通过**

Run: `npm test`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add src/config.js test/config.test.js
git commit -m "feat: implement config manager with tests"
```

---

## Task 3: 视频扫描器

**Files:**
- Create: `src/utils/videoScanner.js`
- Test: `test/utils/videoScanner.test.js`

- [ ] **Step 1: 编写视频扫描器测试**

Create: `test/utils/videoScanner.test.js`

```javascript
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
```

- [ ] **Step 2: 运行测试验证失败**

Run: `npm test`
Expected: FAIL with "Cannot find module '../../src/utils/videoScanner.js'"

- [ ] **Step 3: 实现视频扫描器**

Create: `src/utils/videoScanner.js`

```javascript
import { readdir, stat } from 'fs/promises';
import { join, extname, relative } from 'path';

const DEFAULT_EXTENSIONS = ['.mp4', '.webm', '.ogg', '.mov', '.avi', '.mkv', '.flv', '.wmv'];

export async function scanVideos(directory, baseUrl = '', allowedExtensions = DEFAULT_EXTENSIONS) {
  const videos = [];
  const files = await readdir(directory, { withFileTypes: true });

  for (const file of files) {
    const fullPath = join(directory, file.name);

    if (file.isDirectory()) {
      // Recursively scan subdirectories
      const subVideos = await scanVideos(fullPath, baseUrl, allowedExtensions);
      videos.push(...subVideos);
    } else if (file.isFile()) {
      const ext = extname(file.name).toLowerCase();
      if (allowedExtensions.includes(ext)) {
        const relativePath = relative(directory, fullPath);
        videos.push({
          name: file.name,
          relativePath: relativePath.replace(/\\/g, '/'),
          path: fullPath,
          url: baseUrl ? `${baseUrl}/videos/${relativePath.replace(/\\/g, '/')}` : null
        });
      }
    }
  }

  return videos.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
}
```

- [ ] **Step 4: 运行测试验证通过**

Run: `npm test`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add src/utils/videoScanner.js test/utils/videoScanner.test.js
git commit -m "feat: implement video scanner with tests"
```

---

## Task 4: 安全中间件

**Files:**
- Create: `src/middleware/security.js`
- Test: `test/middleware/security.test.js`

- [ ] **Step 1: 编写安全中间件测试**

Create: `test/middleware/security.test.js`

```javascript
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
```

- [ ] **Step 2: 运行测试验证失败**

Run: `npm test`
Expected: FAIL with "Cannot find module '../../src/middleware/security.js'"

- [ ] **Step 3: 实现安全中间件**

Create: `src/middleware/security.js`

```javascript
import { resolve, normalize, relative } from 'path';

export function securityMiddleware(videoDirectory) {
  const resolvedVideoDir = resolve(videoDirectory);

  return (req, res, next) => {
    const requestPath = req.path;

    // Normalize the path
    const normalizedPath = normalize(requestPath);

    // Check for path traversal attempts
    if (normalizedPath.includes('..') || normalizedPath.startsWith('/')) {
      return res.status(403).json({ error: 'Access denied: invalid path' });
    }

    // Check if the path is within the allowed directory
    const fullPath = resolve(resolvedVideoDir, requestPath.substring(1)); // Remove leading /
    const relativePath = relative(resolvedVideoDir, fullPath);

    if (relativePath.startsWith('..')) {
      return res.status(403).json({ error: 'Access denied: path outside video directory' });
    }

    req.filePath = fullPath;
    next();
  };
}
```

- [ ] **Step 4: 运行测试验证通过**

Run: `npm test`
Expected: PASS (may need to adjust tests based on actual implementation)

- [ ] **Step 5: 提交**

```bash
git add src/middleware/security.js test/middleware/security.test.js
git commit -m "feat: implement security middleware with tests"
```

---

## Task 5: 跨域隔离中间件

**Files:**
- Create: `src/middleware/cors.js`
- Test: `test/middleware/cors.test.js`

- [ ] **Step 1: 编写跨域隔离中间件测试**

Create: `test/middleware/cors.test.js`

```javascript
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { corsIsolationMiddleware } from '../../src/middleware/cors.js';

describe('CORS Isolation Middleware', () => {
  it('should add COOP and COEP headers when HTTPS', async (t) => {
    const req = { secure: true };
    const headers = {};
    const res = {
      setHeader: (name, value) => { headers[name] = value; }
    };
    const nextCalled = [];
    const next = () => nextCalled.push(true);

    await corsIsolationMiddleware(req, res, next);
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

    await corsIsolationMiddleware(req, res, next);
    assert.strictEqual(nextCalled.length, 1);
    assert.strictEqual(headers['Cross-Origin-Opener-Policy'], undefined);
    assert.strictEqual(headers['Cross-Origin-Embedder-Policy'], undefined);
  });
});
```

- [ ] **Step 2: 运行测试验证失败**

Run: `npm test`
Expected: FAIL with "Cannot find module '../../src/middleware/cors.js'"

- [ ] **Step 3: 实现跨域隔离中间件**

Create: `src/middleware/cors.js`

```javascript
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
```

- [ ] **Step 4: 运行测试验证通过**

Run: `npm test`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add src/middleware/cors.js test/middleware/cors.test.js
git commit -m "feat: implement CORS isolation middleware with tests"
```

---

## Task 6: Range请求中间件

**Files:**
- Create: `src/middleware/range.js`
- Test: `test/middleware/range.test.js`

- [ ] **Step 1: 编写Range中间件测试**

Create: `test/middleware/range.test.js`

```javascript
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { rangeMiddleware } from '../../src/middleware/range.js';

describe('Range Middleware', () => {
  it('should parse Range header correctly', async (t) => {
    const req = {
      headers: { range: 'bytes=0-1024' },
      fileStats: { size: 2048 }
    };
    const headers = {};
    const res = {
      setHeader: (name, value) => { headers[name] = value; },
      status: () => res
    };
    const nextCalled = [];
    const next = () => nextCalled.push(true);

    await rangeMiddleware(req, res, next);
    assert.strictEqual(nextCalled.length, 1);
    assert.strictEqual(req.range.start, 0);
    assert.strictEqual(req.range.end, 1024);
  });

  it('should handle open-ended Range', async (t) => {
    const req = {
      headers: { range: 'bytes=0-' },
      fileStats: { size: 2048 }
    };
    const res = { setHeader: () => {}, status: () => res };
    const nextCalled = [];
    const next = () => nextCalled.push(true);

    await rangeMiddleware(req, res, next);
    assert.strictEqual(nextCalled.length, 1);
    assert.strictEqual(req.range.start, 0);
    assert.strictEqual(req.range.end, 2047);
  });
});
```

- [ ] **Step 2: 运行测试验证失败**

Run: `npm test`
Expected: FAIL with "Cannot find module '../../src/middleware/range.js'"

- [ ] **Step 3: 实现Range中间件**

Create: `src/middleware/range.js`

```javascript
export function rangeMiddleware() {
  return (req, res, next) => {
    const rangeHeader = req.headers.range;

    if (!rangeHeader) {
      return next();
    }

    // Parse Range header: "bytes=start-end"
    const matches = rangeHeader.match(/bytes=(\d+)-(\d*)/);

    if (!matches) {
      return res.status(416).json({ error: 'Invalid Range header' });
    }

    const start = parseInt(matches[1], 10);
    let end = matches[2] ? parseInt(matches[2], 10) : req.fileStats.size - 1;

    // Validate range
    if (start >= req.fileStats.size || end >= req.fileStats.size || start > end) {
      return res.status(416).setHeader('Content-Range', `*/${req.fileStats.size}`).end();
    }

    req.range = { start, end };
    next();
  };
}
```

- [ ] **Step 4: 运行测试验证通过**

Run: `npm test`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add src/middleware/range.js test/middleware/range.test.js
git commit -m "feat: implement Range request middleware with tests"
```

---

## Task 7: 视频列表页面路由

**Files:**
- Create: `src/routes/videos.js`

- [ ] **Step 1: 实现视频列表页面路由**

Create: `src/routes/videos.js`

```javascript
import { scanVideos } from '../utils/videoScanner.js';

export function videosRoute(config) {
  return async (req, res) => {
    try {
      const protocol = req.secure ? 'https' : 'http';
      const host = req.get('host');
      const baseUrl = `${protocol}://${host}`;
      const videos = await scanVideos(config.videos.directory, baseUrl, config.videos.allowedExtensions);

      const html = generateVideosHtml(baseUrl, videos);
      res.send(html);
    } catch (error) {
      res.status(500).json({ error: 'Failed to scan videos' });
    }
  };
}

function generateVideosHtml(baseUrl, videos) {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>视频文件列表</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            background: #f5f5f5;
        }
        h1 {
            color: #333;
            margin-bottom: 10px;
            font-size: 28px;
        }
        .server-info {
            color: #666;
            margin-bottom: 20px;
            padding: 10px;
            background: white;
            border-radius: 8px;
            border-left: 4px solid #4CAF50;
        }
        .stats {
            color: #666;
            margin-bottom: 20px;
        }
        .video-list {
            display: grid;
            gap: 15px;
        }
        .video-item {
            background: white;
            padding: 15px;
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            transition: box-shadow 0.2s;
        }
        .video-item:hover {
            box-shadow: 0 4px 8px rgba(0,0,0,0.15);
        }
        .video-info {
            flex: 1;
            margin-right: 20px;
        }
        .video-name {
            font-weight: 600;
            color: #333;
            margin-bottom: 5px;
            font-size: 16px;
        }
        .video-path {
            color: #888;
            font-size: 14px;
            margin-bottom: 8px;
        }
        .video-link {
            color: #2196F3;
            font-size: 12px;
            word-break: break-all;
        }
        .video-actions {
            display: flex;
            gap: 10px;
        }
        .btn {
            padding: 8px 16px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            transition: background 0.2s;
        }
        .btn-copy {
            background: #4CAF50;
            color: white;
        }
        .btn-copy:hover {
            background: #45a049;
        }
        .btn-play {
            background: #2196F3;
            color: white;
        }
        .btn-play:hover {
            background: #0b7dda;
        }
        .empty-state {
            text-align: center;
            padding: 40px;
            color: #888;
            font-size: 16px;
        }
        .icon {
            font-size: 24px;
            margin-right: 10px;
        }
    </style>
</head>
<body>
    <h1>📺 视频文件列表</h1>
    <div class="server-info">
        <strong>服务器:</strong> ${baseUrl}
    </div>
    <div class="stats">
        共找到 <strong>${videos.length}</strong> 个视频文件
    </div>
    <div class="video-list">
        ${videos.length === 0 ? '<div class="empty-state">没有找到视频文件</div>' : ''}
        ${videos.map(video => `
            <div class="video-item">
                <div class="video-info">
                    <div class="video-name">
                        <span class="icon">🎬</span>${video.name}
                    </div>
                    <div class="video-path">📁 ${video.relativePath}</div>
                    <div class="video-link">${video.url}</div>
                </div>
                <div class="video-actions">
                    <button class="btn btn-copy" onclick="copyLink('${video.url}')">复制链接</button>
                    <button class="btn btn-play" onclick="playVideo('${video.url}')">播放视频</button>
                </div>
            </div>
        `).join('')}
    </div>
    <script>
        function copyLink(url) {
            navigator.clipboard.writeText(url).then(() => {
                const btn = event.target;
                const originalText = btn.textContent;
                btn.textContent = '已复制!';
                btn.style.background = '#45a049';
                setTimeout(() => {
                    btn.textContent = originalText;
                    btn.style.background = '#4CAF50';
                }, 2000);
            }).catch(err => {
                alert('复制失败: ' + err);
            });
        }

        function playVideo(url) {
            window.open(url, '_blank');
        }
    </script>
</body>
</html>`;
}
```

- [ ] **Step 2: 提交**

```bash
git add src/routes/videos.js
git commit -m "feat: implement videos list page route"
```

---

## Task 8: 服务器核心

**Files:**
- Create: `src/server.js`

- [ ] **Step 1: 实现服务器核心**

Create: `src/server.js`

```javascript
import express from 'express';
import https from 'https';
import http from 'http';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { lookup } from 'mime-types';
import { securityMiddleware } from './middleware/security.js';
import { corsIsolationMiddleware } from './middleware/cors.js';
import { rangeMiddleware } from './middleware/range.js';
import { videosRoute } from './routes/videos.js';
import { stat, createReadStream } from 'fs';

export class VideoServer {
  constructor(config) {
    this.config = config;
    this.app = express();
    this.server = null;
    this.setupMiddleware();
    this.setupRoutes();
  }

  setupMiddleware() {
    // CORS isolation middleware
    this.app.use(corsIsolationMiddleware({
      enabled: this.config.security.enableCorsIsolation,
      coop: this.config.security.coop,
      coep: this.config.security.coep
    }));

    // Security middleware
    this.app.use('/videos', securityMiddleware(this.config.videos.directory));

    // Range middleware
    this.app.use('/videos', rangeMiddleware());

    // Logging
    this.app.use((req, res, next) => {
      console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
      next();
    });
  }

  setupRoutes() {
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        protocol: req.secure ? 'https' : 'http'
      });
    });

    // Video list page
    this.app.get('/videos.html', videosRoute(this.config));

    // Video files
    this.app.get('/videos/*', async (req, res, next) => {
      try {
        const filePath = req.filePath;

        // Check if file exists
        if (!existsSync(filePath)) {
          return res.status(404).json({ error: 'File not found' });
        }

        const fileStats = await stat(filePath);
        req.fileStats = fileStats;

        // Set content type
        const contentType = lookup(filePath) || 'application/octet-stream';
        res.setHeader('Content-Type', contentType);
        res.setHeader('Accept-Ranges', 'bytes');

        // Handle range requests
        if (req.range) {
          const { start, end } = req.range;
          const contentLength = end - start + 1;

          res.status(206);
          res.setHeader('Content-Range', `bytes ${start}-${end}/${fileStats.size}`);
          res.setHeader('Content-Length', contentLength);

          const stream = createReadStream(filePath, { start, end });
          stream.pipe(res);
        } else {
          res.setHeader('Content-Length', fileStats.size);
          const stream = createReadStream(filePath);
          stream.pipe(res);
        }
      } catch (error) {
        console.error('Error serving video:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    // 404 handler
    this.app.use((req, res) => {
      res.status(404).json({ error: 'Not found' });
    });

    // Error handler
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
        // HTTPS server
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
        // HTTP server
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
        resolve();
      }
    });
  }

  stop() {
    return new Promise((resolve) => {
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
```

- [ ] **Step 2: 提交**

```bash
git add src/server.js
git commit -m "feat: implement server core"
```

---

## Task 9: 启动入口

**Files:**
- Create: `src/index.js`

- [ ] **Step 1: 实现启动入口**

Create: `src/index.js`

```javascript
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';
import { loadConfig } from './config.js';
import { VideoServer } from './server.js';
import { scanVideos } from './utils/videoScanner.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = resolve(__filename, '..');

async function main() {
  try {
    // Load config
    const configPath = resolve(__dirname, '../config.json5');
    const config = await loadConfig(configPath);

    // Create server
    const server = new VideoServer(config);

    // Start server
    await server.start();

    // Display startup info
    const protocol = config.server.https.enabled ? 'https' : 'http';
    const port = config.server.port;
    const baseUrl = `${protocol}://localhost:${port}`;

    console.log(chalk.green('✓ 服务器已启动:'), chalk.cyan(baseUrl));
    console.log(chalk.green('✓ 视频目录:'), chalk.cyan(resolve(__dirname, '../', config.videos.directory)));

    if (config.server.https.enabled) {
      console.log(chalk.green('✓ HTTPS已启用'));
    }

    if (config.security.enableCorsIsolation && config.server.https.enabled) {
      console.log(chalk.green('✓ 跨域隔离已配置'));
      console.log(chalk.gray('  COOP:'), chalk.cyan(config.security.coop));
      console.log(chalk.gray('  COEP:'), chalk.cyan(config.security.coep));
    }

    // Scan and display videos
    const videoDir = resolve(__dirname, '../', config.videos.directory);
    const videos = await scanVideos(videoDir, baseUrl, config.videos.allowedExtensions);

    if (videos.length > 0) {
      console.log(chalk.green(`✓ 发现 ${videos.length} 个视频文件`));
      console.log('');
      console.log(chalk.yellow('📺 可用的视频链接:'));
      console.log(chalk.gray('━'.repeat(50)));

      videos.forEach((video, index) => {
        console.log(chalk.white(`${index + 1}. ${video.relativePath}`));
        console.log(chalk.cyan(`   ${video.url}`));
        console.log('');
      });
    } else {
      console.log(chalk.yellow('⚠ 未找到视频文件'));
      console.log(chalk.gray(`  请将视频文件放置在: ${videoDir}`));
    }

    console.log('');
    console.log(chalk.yellow('访问视频列表页面:'), chalk.cyan(`${baseUrl}/videos.html`));
    console.log('');

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      console.log(chalk.yellow('Received SIGTERM, shutting down...'));
      await server.stop();
      process.exit(0);
    });

    process.on('SIGINT', async () => {
      console.log(chalk.yellow('Received SIGINT, shutting down...'));
      await server.stop();
      process.exit(0);
    });

  } catch (error) {
    console.error(chalk.red('Failed to start server:'), error);
    process.exit(1);
  }
}

main();
```

- [ ] **Step 2: 提交**

```bash
git add src/index.js
git commit -m "feat: implement main entry point"
```

---

## Task 10: 集成测试

**Files:**
- Create: `test/integration.test.js`

- [ ] **Step 1: 编写集成测试**

Create: `test/integration.test.js`

```javascript
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
    assert.ok(html.includes('video1.mp4'));
    assert.ok(html.includes('test2.mp4'));
  });
});
```

- [ ] **Step 2: 运行集成测试**

Run: `npm test`
Expected: PASS

- [ ] **Step 3: 提交**

```bash
git add test/integration.test.js
git commit -m "test: add integration tests"
```

---

## Task 11: 创建示例视频目录

**Files:**
- Create: `videos/.gitkeep`

- [ ] **Step 1: 创建videos目录并添加.gitkeep**

Create: `videos/.gitkeep`

```bash
# This file ensures the videos directory is tracked by git
```

- [ ] **Step 2: 提交**

```bash
git add videos/.gitkeep
git commit -m "feat: add videos directory"
```

---

## Task 12: 完整测试

- [ ] **Step 1: 运行所有测试**

Run: `npm test`
Expected: All tests pass

- [ ] **Step 2: 手动测试服务器**

Run: `npm start`
Expected:
- Server starts successfully
- Console shows video links
- Can access `http://localhost:3000/health`
- Can access `http://localhost:3000/videos.html`
- Can serve video files (add a test video to `videos/` directory)

- [ ] **Step 3: 最终提交**

```bash
git add .
git commit -m "feat: complete video share service implementation"
```

---

## 测试清单

完成实现后,请验证以下功能:

- [ ] 服务器可以启动(HTTP模式)
- [ ] 服务器可以启动(HTTPS模式,需要证书)
- [ ] 健康检查接口 `/health` 正常工作
- [ ] 视频列表页面 `/videos.html` 正常显示
- [ ] 可以访问视频文件 `http://localhost:3000/videos/test.mp4`
- [ ] Range请求正常工作(使用curl测试: `curl -r 0-1024 http://localhost:3000/videos/test.mp4`)
- [ ] HTTPS模式下COOP/COEP头正确设置
- [ ] 路径遍历攻击被阻止
- [ ] 控制台正确显示视频链接列表
- [ ] 复制链接按钮功能正常

## 部署说明

1. 安装依赖: `npm install`
2. 可选: 生成HTTPS证书
3. 配置 `config.json`
4. 启动服务: `npm start`
5. 访问 `http://localhost:3000/videos.html` 查看视频列表

## HTTPS证书生成(可选)

```bash
openssl req -newkey rsa:2048 -nodes -keyout key.pem -x509 -days 365 -out cert.pem
```

然后在 `config.json` 中启用HTTPS。
