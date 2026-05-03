# 图片共享服务实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 node-video-share 项目添加独立的图片目录 HTTP 共享功能，支持网格预览界面和强缓存策略

**Architecture:** 采用独立模式，与视频服务完全分离。创建独立的图片扫描工具、路由处理器和 HTML 页面，复用现有的安全中间件和 CORS 配置。

**Tech Stack:** Node.js ES Modules, Express.js, mime-types, fs/promises

---

## 文件结构映射

### 新增文件
- `src/utils/imageScanner.js` - 图片扫描工具
- `src/routes/images.js` - 图片列表页面路由
- `test/utils/imageScanner.test.js` - 图片扫描单元测试
- `images/.gitkeep` - 图片目录占位文件

### 修改文件
- `src/config.js` - 添加 images 默认配置
- `src/server.js` - 添加 /images 路由和安全中间件
- `src/index.js` - 启动时扫描图片并显示信息
- `config.json5` - 添加 images 配置示例

---

## 前置检查

在开始实现前，先查看现有代码以理解模式：

- [ ] 阅读 `src/utils/videoScanner.js` 了解扫描逻辑模式
- [ ] 阅读 `src/middleware/security.js` 了解安全验证机制
- [ ] 阅读 `src/routes/videos.js` 了解 HTML 生成模式

---

### Task 1: 创建图片扫描工具

**Files:**
- Create: `src/utils/imageScanner.js`
- Test: `test/utils/imageScanner.test.js`

**参考:** `src/utils/videoScanner.js` 的实现模式

- [ ] **Step 1: 编写测试用例 - 空目录扫描**

```javascript
// test/utils/imageScanner.test.js
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { scanImages } from '../../src/utils/imageScanner.js';

describe('scanImages', () => {
  const testDir = join(process.cwd(), 'test-temp-images');

  it('should return empty array for empty directory', async () => {
    await mkdir(testDir, { recursive: true });
    try {
      const images = await scanImages(testDir, 'http://localhost:3000', ['.jpg', '.png']);
      assert.strictEqual(images.length, 0);
    } finally {
      await rm(testDir, { recursive: true, force: true });
    }
  });
});
```

- [ ] **Step 2: 运行测试验证失败**

```bash
node --test test/utils/imageScanner.test.js
```

预期：FAIL with "scanImages is not defined"

- [ ] **Step 3: 创建 imageScanner.js 基础结构**

```javascript
// src/utils/imageScanner.js
import { readdir, stat } from 'fs/promises';
import { join, relative } from 'path';

export async function scanImages(directory, baseUrl, allowedExtensions) {
  const images = [];
  
  async function scanDir(dir) {
    const entries = await readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      
      // 跳过隐藏文件和目录
      if (entry.name.startsWith('.')) {
        continue;
      }
      
      if (entry.isDirectory()) {
        await scanDir(fullPath);
      } else if (entry.isFile()) {
        const ext = entry.name.substring(entry.name.lastIndexOf('.')).toLowerCase();
        
        if (allowedExtensions.includes(ext)) {
          const fileStats = await stat(fullPath);
          const relPath = relative(directory, fullPath);
          
          images.push({
            name: entry.name,
            path: fullPath,
            relativePath: relPath,
            url: `${baseUrl}/images/${relPath.replace(/\\/g, '/')}`,
            size: fileStats.size,
            extension: ext
          });
        }
      }
    }
  }
  
  await scanDir(directory);
  return images;
}
```

- [ ] **Step 4: 运行测试验证通过**

```bash
node --test test/utils/imageScanner.test.js
```

预期：PASS

- [ ] **Step 5: 添加更多测试用例**

```javascript
// 在 test/utils/imageScanner.test.js 中添加

  it('should scan images in subdirectories', async () => {
    const subDir = join(testDir, 'subdir');
    await mkdir(subDir, { recursive: true });
    await writeFile(join(subDir, 'test.jpg'), 'fake image content');
    
    try {
      const images = await scanImages(testDir, 'http://localhost:3000', ['.jpg']);
      assert.strictEqual(images.length, 1);
      assert.strictEqual(images[0].name, 'test.jpg');
      assert.ok(images[0].relativePath.includes('subdir'));
    } finally {
      await rm(testDir, { recursive: true, force: true });
    }
  });

  it('should filter by allowed extensions', async () => {
    await writeFile(join(testDir, 'photo.jpg'), 'content');
    await writeFile(join(testDir, 'document.pdf'), 'content');
    
    try {
      const images = await scanImages(testDir, 'http://localhost:3000', ['.jpg', '.png']);
      assert.strictEqual(images.length, 1);
      assert.strictEqual(images[0].name, 'photo.jpg');
    } finally {
      await rm(testDir, { recursive: true, force: true });
    }
  });

  it('should skip hidden files', async () => {
    await writeFile(join(testDir, '.hidden.jpg'), 'content');
    await writeFile(join(testDir, 'visible.jpg'), 'content');
    
    try {
      const images = await scanImages(testDir, 'http://localhost:3000', ['.jpg']);
      assert.strictEqual(images.length, 1);
      assert.strictEqual(images[0].name, 'visible.jpg');
    } finally {
      await rm(testDir, { recursive: true, force: true });
    }
  });
```

需要在测试文件顶部添加：
```javascript
import { writeFile } from 'node:fs/promises';
```

- [ ] **Step 6: 运行所有测试验证通过**

```bash
node --test test/utils/imageScanner.test.js
```

预期：所有测试 PASS

- [ ] **Step 7: 提交**

```bash
git add src/utils/imageScanner.js test/utils/imageScanner.test.js
git commit -m "feat: add image scanner utility with tests"
```

---

### Task 2: 更新配置文件

**Files:**
- Modify: `src/config.js`
- Modify: `config.json5`

- [ ] **Step 1: 在 config.js 中添加 images 默认配置**

```javascript
// src/config.js - 修改 DEFAULT_CONFIG
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
  images: {
    directory: './images',
    allowedExtensions: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg']
  },
  security: {
    enableCorsIsolation: true,
    coop: 'same-origin',
    coep: 'require-corp'
  }
};
```

- [ ] **Step 2: 更新 mergeConfig 函数**

```javascript
// src/config.js - 修改 mergeConfig 函数
function mergeConfig(defaults, userConfig) {
  return {
    server: { ...defaults.server, ...userConfig.server },
    videos: { ...defaults.videos, ...userConfig.videos },
    images: { ...defaults.images, ...userConfig.images },
    security: { ...defaults.security, ...userConfig.security }
  };
}
```

- [ ] **Step 3: 在 config.json5 中添加 images 配置示例**

```json5
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
    "directory": "D:\\00video-media",
    "allowedExtensions": [
      ".mp4",
      ".webm",
      ".ogg",
      ".mov",
      ".avi",
      ".mkv",
      ".flv",
      ".wmv",
      ".ps",
      ".ts"
    ],
    "remoteVideos": [
      {
        "id": "sample1",
        "name": "赛车手",
        "duration": "00:10",
        "url": "https://ff0be01e-hri-aiop-train-develop.oss-cn-hangzhou.aliyuncs.com/video/8ea30f94e89740238a1f9a350abc79e6.mp4"
      },
      {
        "id": "sample2",
        "name": "加密视频",
        "key": "0709005b07e9aea7",
        "duration": "01:14",
        "url": "http://saas-trainningdata-test.oss-cn-hangzhou.aliyuncs.com/video/1739427494754d0bd4208?Expires=4070880001&OSSAccessKeyId=LTAI0nvqaUuErF4G&Signature=rPU8H%2FQppk%2BFil2bkQdhfoQXuSQ%3D"
      }
    ]
  },
  "images": {
    "directory": "./images",
    "allowedExtensions": [".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg"]
  },
  "security": {
    "enableCorsIsolation": true,
    "coop": "same-origin",
    "coep": "require-corp"
  }
}
```

- [ ] **Step 4: 提交**

```bash
git add src/config.js config.json5
git commit -m "feat: add images configuration defaults and example"
```

---

### Task 3: 创建图片列表路由

**Files:**
- Create: `src/routes/images.js`

**参考:** `src/routes/videos.js` 的 HTML 生成模式

- [ ] **Step 1: 创建 images.js 基础结构**

```javascript
// src/routes/images.js
import { scanImages } from '../utils/imageScanner.js';

export function imagesRoute(config) {
  return async (req, res) => {
    try {
      const protocol = req.secure ? 'https' : 'http';
      const host = req.get('host');
      const baseUrl = `${protocol}://${host}`;
      const images = await scanImages(
        config.images.directory,
        baseUrl,
        config.images.allowedExtensions
      );

      const html = generateImagesHtml(baseUrl, images);
      res.send(html);
    } catch (error) {
      res.status(500).json({ error: 'Failed to scan images' });
    }
  };
}

function generateImagesHtml(baseUrl, images) {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>图片文件列表</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 1400px;
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
            border-left: 4px solid #9C27B0;
        }
        .stats {
            color: #666;
            margin-bottom: 20px;
        }
        .image-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
            gap: 20px;
        }
        .image-card {
            background: white;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            transition: box-shadow 0.2s, transform 0.2s;
        }
        .image-card:hover {
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            transform: translateY(-2px);
        }
        .image-preview {
            width: 100%;
            height: 200px;
            object-fit: cover;
            background: #f0f0f0;
            display: block;
        }
        .image-info {
            padding: 12px;
        }
        .image-name {
            font-weight: 600;
            color: #333;
            margin-bottom: 4px;
            font-size: 14px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }
        .image-path {
            color: #888;
            font-size: 12px;
            margin-bottom: 10px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }
        .image-actions {
            display: flex;
            gap: 8px;
        }
        .btn {
            flex: 1;
            padding: 6px 12px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
            transition: background 0.2s;
            text-align: center;
            text-decoration: none;
        }
        .btn-copy {
            background: #9C27B0;
            color: white;
        }
        .btn-copy:hover {
            background: #7B1FA2;
        }
        .btn-view {
            background: #2196F3;
            color: white;
        }
        .btn-view:hover {
            background: #0b7dda;
        }
        .empty-state {
            text-align: center;
            padding: 60px 20px;
            color: #888;
            font-size: 16px;
            grid-column: 1 / -1;
        }
        .nav-link {
            display: inline-block;
            margin-bottom: 20px;
            color: #1976D2;
            text-decoration: none;
        }
        .nav-link:hover {
            text-decoration: underline;
        }
    </style>
</head>
<body>
    <a class="nav-link" href="/videos.html">← 返回视频列表</a>
    <h1>🖼️ 图片文件列表</h1>
    <div class="server-info">
        <strong>服务器:</strong> ${baseUrl}
    </div>
    <div class="stats">
        图片总数: <strong>${images.length}</strong> 个
    </div>

    <div class="image-grid">
        ${images.length === 0 ? '<div class="empty-state">没有找到图片文件<br><small>请将图片文件放置在配置的目录中</small></div>' : ''}
        ${images.map(image => `
            <div class="image-card">
                <img class="image-preview" src="${image.url}" alt="${image.name}" loading="lazy">
                <div class="image-info">
                    <div class="image-name" title="${image.name}">${image.name}</div>
                    <div class="image-path" title="${image.relativePath}">${image.relativePath}</div>
                    <div class="image-actions">
                        <button class="btn btn-copy" onclick="copyLink('${image.url}', this)">复制链接</button>
                        <a class="btn btn-view" href="${image.url}" target="_blank">查看大图</a>
                    </div>
                </div>
            </div>
        `).join('')}
    </div>

    <script>
        function copyLink(url, button) {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(url).then(function() {
                    var originalText = button.textContent;
                    button.textContent = '已复制!';
                    button.style.background = '#7B1FA2';
                    setTimeout(function() {
                        button.textContent = originalText;
                        button.style.background = '#9C27B0';
                    }, 2000);
                }).catch(function() {
                    fallbackCopy(url, button);
                });
            } else {
                fallbackCopy(url, button);
            }
        }

        function fallbackCopy(url, button) {
            var textArea = document.createElement('textarea');
            textArea.value = url;
            textArea.style.position = 'fixed';
            textArea.style.left = '-999999px';
            textArea.style.opacity = '0';
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            try {
                document.execCommand('copy');
                var originalText = button.textContent;
                button.textContent = '已复制!';
                button.style.background = '#7B1FA2';
                setTimeout(function() {
                    button.textContent = originalText;
                    button.style.background = '#9C27B0';
                }, 2000);
            } catch (err) {
                alert('复制失败: ' + err);
            }
            document.body.removeChild(textArea);
        }
    </script>
</body>
</html>`;
}
```

- [ ] **Step 2: 提交**

```bash
git add src/routes/images.js
git commit -m "feat: add images list route with grid preview UI"
```

---

### Task 4: 更新服务器配置

**Files:**
- Modify: `src/server.js`

- [ ] **Step 1: 导入 imagesRoute**

```javascript
// src/server.js - 在导入部分添加
import { imagesRoute } from './routes/images.js';
```

- [ ] **Step 2: 在 setupMiddleware 中添加图片安全中间件**

```javascript
// src/server.js - 在 setupMiddleware 方法中添加
setupMiddleware() {
  
  this.app.use('/videos', securityMiddleware(this.config.videos.directory));
  this.app.use('/videos', rangeMiddleware());
  
  // 添加图片安全中间件
  this.app.use('/images', securityMiddleware(this.config.images.directory));
}
```

- [ ] **Step 3: 在 setupRoutes 中添加图片列表路由**

```javascript
// src/server.js - 在 setupRoutes 方法中添加
setupRoutes() {
  
  this.app.get('/videos.html', videosRoute(this.config));
  this.app.get('/ws-videos.html', wsVideosRoute(this.config));
  this.app.get('/images.html', imagesRoute(this.config)); // 新增
  
}
```

- [ ] **Step 4: 在 setupRoutes 中添加图片文件服务路由**

在 `/videos/*` 路由之后添加：

```javascript
// src/server.js - 在 /videos/* 路由后添加

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

        const stream = createReadStream(filePath);
        stream.pipe(res);
      } catch (error) {
        console.error('Error serving image:', error);
        res.status(500).json({ error: 'Internal server error', message: error.message });
      }
    });
```

- [ ] **Step 5: 提交**

```bash
git add src/server.js
git commit -m "feat: add image serving routes with cache headers"
```

---

### Task 5: 更新启动脚本

**Files:**
- Modify: `src/index.js`

- [ ] **Step 1: 导入 scanImages**

```javascript
// src/index.js - 在导入部分添加
import { scanImages } from './utils/imageScanner.js';
```

- [ ] **Step 2: 在启动后扫描图片并显示信息**

在视频扫描代码之后添加：

```javascript
// src/index.js - 在视频扫描代码后添加

    // 扫描图片
    const imageDir = resolve(config.images.directory);
    const images = await scanImages(imageDir, baseUrl, config.images.allowedExtensions);

    if (images.length > 0) {
      console.log(chalk.green(`✓ 发现 ${images.length} 个图片`));
      console.log('');
      console.log(chalk.yellow('🖼️ 图片链接示例:'));
      images.slice(0, 3).forEach((image, index) => {
        console.log(chalk.white(`${index + 1}. ${image.relativePath}`));
        console.log(chalk.cyan(`   ${image.url}`));
        console.log('');
      });
    } else {
      console.log(chalk.yellow('⚠ 未找到图片文件'));
      console.log(chalk.gray(`  请将图片文件放置在: ${imageDir}`));
    }

    console.log('');
    console.log(chalk.yellow('访问图片列表页面:'), chalk.cyan(`${baseUrl}/images.html`));
    console.log('');
```

- [ ] **Step 3: 提交**

```bash
git add src/index.js
git commit -m "feat: add image scanning on startup with console output"
```

---

### Task 6: 创建图片目录

**Files:**
- Create: `images/.gitkeep`

- [ ] **Step 1: 创建 images 目录和占位文件**

```bash
mkdir -p images
echo "# Image directory" > images/.gitkeep
```

- [ ] **Step 2: 提交**

```bash
git add images/.gitkeep
git commit -m "chore: create images directory with gitkeep"
```

---

### Task 7: 集成测试

**Files:**
- Manual testing

- [ ] **Step 1: 准备测试图片**

在 `images` 目录放置 2-3 张测试图片（可以是小尺寸的 jpg/png）

```bash
# 示例：复制一些测试图片到 images 目录
cp /path/to/test-photo.jpg images/
cp /path/to/test-image.png images/subdir/
```

- [ ] **Step 2: 启动服务器**

```bash
npm start
```

- [ ] **Step 3: 验证控制台输出**

检查是否显示：
- ✓ 发现 N 个图片
- 🖼️ 图片链接示例
- 访问图片列表页面: http://localhost:3000/images.html

- [ ] **Step 4: 访问图片列表页面**

浏览器打开：`http://localhost:3000/images.html`

验证：
- 页面正确加载
- 图片缩略图显示
- 文件名和路径显示
- "复制链接"按钮工作正常
- "查看大图"在新标签页打开图片

- [ ] **Step 5: 验证缓存头**

在浏览器开发者工具的 Network 面板中：
- 刷新页面
- 点击任意图片请求
- 检查 Response Headers 包含：`Cache-Control: public, max-age=2592000`

- [ ] **Step 6: 验证 Content-Type**

检查图片响应的 Content-Type 是否正确（如 `image/jpeg`, `image/png`）

- [ ] **Step 7: 测试路径遍历防护**

尝试访问：`http://localhost:3000/images/../../../etc/passwd`

预期：返回 403 Forbidden 或 404 Not Found

- [ ] **Step 8: 运行单元测试**

```bash
npm test
```

预期：所有测试通过

- [ ] **Step 9: 清理测试图片（可选）**

如果不想提交测试图片：

```bash
rm -rf images/*
git add images/
git commit -m "test: verify image sharing functionality"
```

---

## 完成检查清单

- [ ] 所有任务完成
- [ ] 所有测试通过
- [ ] 手动测试通过
- [ ] 代码已提交
- [ ] 设计文档已保存
- [ ] 实现计划已保存

---

## 后续步骤

实现完成后，可以：
1. 将代码合并到主分支
2. 创建 Pull Request
3. 进行代码审查
4. 部署到生产环境
