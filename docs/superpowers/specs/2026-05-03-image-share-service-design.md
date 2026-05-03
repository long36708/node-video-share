# 图片共享服务设计文档

## 概述

为 node-video-share 项目增加独立的图片目录 HTTP 共享功能，支持将指定目录下的图片文件通过 HTTP 服务共享，提供网格预览界面和强缓存策略。

## 需求总结

- **架构模式**：独立模式 - 图片服务与视频服务完全分离
- **支持格式**：`.jpg`, `.jpeg`, `.png`, `.gif`, `.webp`, `.svg`
- **展示方式**：网格预览模式 - 缩略图网格布局，点击查看大图
- **缓存策略**：强缓存 - `Cache-Control: public, max-age=2592000`（30天）
- **配置方式**：独立配置项 - `images.directory` 和 `images.allowedExtensions`

## 架构设计

### 1. 目录结构

```
src/
├── utils/
│   ├── videoScanner.js      # 现有视频扫描工具
│   └── imageScanner.js      # 新增：图片扫描工具
├── routes/
│   ├── videos.js            # 现有视频列表路由
│   ├── images.js            # 新增：图片列表路由
│   ├── proxy.js
│   ├── websocket.js
│   └── ws-videos.js
├── middleware/
│   ├── cors.js
│   ├── range.js
│   └── security.js          # 复用：路径安全验证
├── config.js                # 修改：添加 images 默认配置
├── server.js                # 修改：添加 /images 路由处理
└── index.js                 # 修改：启动时扫描图片并显示信息
```

### 2. 配置设计

在 `config.json5` 中添加独立的 images 配置块：

```json5
{
  "images": {
    "directory": "./images",
    "allowedExtensions": [".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg"]
  }
}
```

在 `src/config.js` 的 `DEFAULT_CONFIG` 中添加默认值：

```javascript
const DEFAULT_CONFIG = {
  server: { ... },
  videos: { ... },
  images: {
    directory: './images',
    allowedExtensions: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg']
  },
  security: { ... }
};
```

### 3. 核心组件

#### 3.1 图片扫描工具 (`src/utils/imageScanner.js`)

**职责**：递归扫描图片目录，生成图片元数据列表

**输入**：
- `directory`: 图片根目录路径
- `baseUrl`: 服务器基础 URL
- `allowedExtensions`: 允许的图片扩展名列表

**输出**：图片对象数组
```javascript
[
  {
    name: "photo.jpg",
    path: "/absolute/path/to/photo.jpg",
    relativePath: "subdir/photo.jpg",
    url: "http://localhost:3000/images/subdir/photo.jpg",
    size: 102400,
    extension: ".jpg"
  }
]
```

**实现要点**：
- 复用 `videoScanner.js` 的递归扫描逻辑
- 使用 `fs/promises` 的 `readdir` 和 `stat`
- 过滤隐藏文件和不允许的扩展名
- 计算相对路径用于显示

#### 3.2 图片列表路由 (`src/routes/images.js`)

**职责**：生成图片列表 HTML 页面

**路由**：`GET /images.html`

**功能**：
- 调用 `imageScanner` 获取图片列表
- 生成网格布局的 HTML 页面
- 每个图片卡片包含：
  - 缩略图预览（`<img>` 标签直接引用 `/images/...` 路径）
  - 文件名
  - 相对路径
  - 复制链接按钮
  - 查看大图按钮（新标签页打开）

**页面特性**：
- 响应式网格布局（CSS Grid）
- 悬停效果
- 复制到剪贴板功能
- 统计信息（图片总数）
- 空状态提示

#### 3.3 图片文件服务路由 (`src/server.js`)

**路由**：`GET /images/*`

**中间件链**：
1. 安全中间件 - 防止路径遍历攻击
2. CORS 中间件 - 已在全局配置
3. 缓存中间件 - 设置强缓存头

**处理逻辑**：
```javascript
app.get('/images/*', async (req, res) => {
  // 1. 从 req.filePath 获取安全验证后的文件路径
  // 2. 检查文件是否存在
  // 3. 获取文件 stats
  // 4. 设置 Content-Type（使用 mime-types 库）
  // 5. 设置 Cache-Control: public, max-age=2592000
  // 6. 设置 Content-Length
  // 7. 使用 createReadStream 流式传输文件
});
```

**关键差异**（相比视频路由）：
- 不需要 Range 请求支持（图片通常较小）
- 需要强缓存头
- MIME 类型自动识别（mime-types 已支持图片格式）

#### 3.4 安全中间件复用

复用现有的 `src/middleware/security.js`：

```javascript
app.use('/images', securityMiddleware(config.images.directory));
```

该中间件负责：
- 验证请求路径不超出允许的目录
- 防止 `..` 路径遍历攻击
- 将安全的文件路径附加到 `req.filePath`

### 4. 启动流程修改 (`src/index.js`)

在服务器启动后：

```javascript
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
}

console.log(chalk.yellow('访问图片列表页面:'), chalk.cyan(`${baseUrl}/images.html`));
```

## 数据流

### 图片列表页面访问流程

```
用户访问 /images.html
    ↓
imagesRoute 处理器
    ↓
调用 imageScanner 扫描目录
    ↓
生成 HTML（包含图片缩略图和链接）
    ↓
返回 HTML 响应
```

### 图片文件访问流程

```
浏览器请求 /images/photo.jpg
    ↓
CORS 中间件（添加跨域头）
    ↓
Security 中间件（验证路径安全性）
    ↓
/images/* 路由处理器
    ↓
读取文件 stats
    ↓
设置响应头（Content-Type, Cache-Control, Content-Length）
    ↓
流式传输文件内容
    ↓
浏览器缓存图片（30天）
```

## 错误处理

### 1. 目录不存在
- 扫描时返回空数组
- 页面显示"未找到图片文件"
- 控制台提示创建目录

### 2. 文件不存在
- 返回 404 JSON 响应
- 包含友好的错误信息

### 3. 路径遍历攻击
- Security 中间件拦截
- 返回 403 Forbidden

### 4. MIME 类型未知
- 使用 `application/octet-stream` 作为后备
- mime-types 库已覆盖所有常见图片格式

## 性能考虑

### 1. 缓存策略
- 强缓存 30 天，减少服务器负载
- 适合静态图片资源
- 更新图片需更改文件名或使用查询参数

### 2. 流式传输
- 使用 `createReadStream` 避免大文件占用内存
- 虽然图片通常较小，但保持一致性

### 3. 扫描优化
- 启动时一次性扫描，非实时扫描
- 如需实时更新，可添加文件监听（未来增强）

## 测试策略

### 单元测试
- `imageScanner.test.js` - 测试扫描逻辑
  - 空目录
  - 混合文件类型
  - 嵌套子目录
  - 隐藏文件过滤

### 集成测试
- 访问 `/images.html` 返回正确 HTML
- 访问 `/images/photo.jpg` 返回图片内容
- 验证 Cache-Control 头
- 验证 Content-Type 头
- 路径遍历攻击被阻止

### 手动测试
1. 在 `./images` 目录放置测试图片
2. 启动服务器
3. 访问 `http://localhost:3000/images.html`
4. 验证缩略图显示
5. 点击"查看大图"在新标签页打开
6. 点击"复制链接"成功复制
7. 浏览器开发者工具验证缓存头

## 兼容性

### 浏览器支持
- 所有现代浏览器支持图片格式
- SVG 需要注意 XSS 防护（通过 CSP 或 sanitization）

### Node.js 版本
- 使用 ES Modules（项目已有）
- 需要 Node.js 14+（`fs/promises` 稳定版）

## 未来增强

1. **图片懒加载** - 大量图片时使用 Intersection Observer
2. **图片压缩** - 提供不同质量的缩略图
3. **实时扫描** - 使用 chokidar 监听文件变化
4. **图片搜索** - 按文件名过滤
5. **相册分组** - 按子目录分组显示
6. **EXIF 信息** - 显示拍摄日期、相机信息等

## 实施清单

- [ ] 创建 `src/utils/imageScanner.js`
- [ ] 创建 `src/routes/images.js`
- [ ] 修改 `src/config.js` 添加 images 默认配置
- [ ] 修改 `src/server.js` 添加 /images 路由和安全中间件
- [ ] 修改 `src/index.js` 添加图片扫描和日志输出
- [ ] 创建 `test/utils/imageScanner.test.js`
- [ ] 更新 `config.json5` 示例配置
- [ ] 创建 `./images` 目录和 `.gitkeep`
- [ ] 手动测试验证功能
- [ ] 运行单元测试
