# 视频共享服务设计文档

## 项目概述

开发一个轻量级的Node.js视频共享服务,用于本地开发/测试环境下的快速视频文件共享。支持HTTP和HTTPS协议,在HTTPS环境下自动配置跨域隔离头(COOP/COEP),支持Range请求以优化视频播放体验。

## 功能需求

### 核心功能
- 通过HTTP/HTTPS提供本地视频文件的直接访问
- 支持文件路径访问方式: `http://localhost:3000/videos/myvideo.mp4`
- HTTPS环境下自动配置跨域隔离头
- 支持Range请求,实现视频流式传输
- 使用配置文件控制服务参数
- **快速获取视频链接**: 服务启动时在控制台输出所有视频链接
- **网页视频列表**: 提供 `/videos.html` 页面展示所有视频,支持一键复制链接

### 非功能需求
- 简单易用,最小化依赖
- 安全性:防止目录遍历攻击
- 性能:流式传输视频,不占用大量内存
- 可配置:通过JSON配置文件控制

## 技术栈

- **运行时**: Node.js
- **Web框架**: Express.js
- **HTTPS**: Node.js原生https模块
- **配置**: JSON配置文件
- **依赖包**:
  - `express`: Web框架
  - `mime-types`: MIME类型检测
  - `chalk`: 控制台输出彩色文本

## 系统架构

### 整体架构

```
配置文件 → 配置管理器 → 服务器 → 中间件链 → 静态文件服务
                           ↓
                     HTTPS/HTTP
                           ↓
                    跨域隔离头
                           ↓
                    Range请求处理
                           ↓
                     返回视频流
```

### 组件设计

#### 1. 配置管理器 (`src/config.js`)
**职责:**
- 读取和验证 `config.json` 配置文件
- 提供默认配置值
- 配置验证和错误提示

**配置结构:**
```json
{
  "server": {
    "port": 3000,
    "https": {
      "enabled": false,
      "key": "path/to/key.pem",
      "cert": "path/to/cert.pem"
    }
  },
  "videos": {
    "directory": "./videos"
  },
  "security": {
    "enableCorsIsolation": true,
    "coop": "same-origin",
    "coep": "require-corp"
  }
}
```

#### 2. 服务器核心 (`src/server.js`)
**职责:**
- 创建HTTP/HTTPS服务器
- 配置Express应用
- 注册中间件
- 处理错误和优雅关闭

**关键方法:**
- `createServer()`: 根据配置创建HTTP或HTTPS服务器
- `setupMiddleware()`: 配置中间件链
- `start()`: 启动服务器监听

#### 3. Range请求中间件 (`src/middleware/range.js`)
**职责:**
- 解析Range请求头
- 验证Range格式
- 设置正确的响应头
- 创建流式响应

**关键功能:**
- 支持 `Range: bytes=start-end` 格式
- 支持 `Range: bytes=start-` 和 `Range: bytes=-suffix` 格式
- 返回 `Accept-Ranges: bytes`
- 返回 `Content-Range: bytes start-end/total`
- 返回正确的HTTP状态码: 206 (Partial Content) 或 416 (Range Not Satisfiable)

#### 4. 跨域隔离中间件 (`src/middleware/cors.js`)
**职责:**
- 检测HTTPS环境
- 添加COOP/COEP响应头
- 支持自定义隔离级别

**响应头:**
```
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

#### 5. 安全中间件 (`src/middleware/security.js`)
**职责:**
- 验证请求路径,防止目录遍历
- 限制访问范围在配置的视频目录内
- 处理非法路径请求

**安全措施:**
- 规范化路径,防止 `../` 攻击
- 验证路径是否在允许的目录内
- 返回403或404错误

#### 6. 启动入口 (`src/index.js`)
**职责:**
- 加载配置
- 初始化服务器
- 扫描视频目录
- 输出视频链接列表
- 启动监听
- 处理异常

#### 7. 视频扫描器 (`src/utils/videoScanner.js`)
**职责:**
- 扫描视频目录,递归查找视频文件
- 过滤视频文件(根据扩展名)
- 生成视频访问链接
- 返回视频文件列表

#### 8. 视频列表页面 (`src/routes/videos.js`)
**职责:**
- 提供 `/videos.html` 路由
- 生成HTML页面展示视频列表
- 集成复制链接功能
- 提供视频播放预览

## API设计

### 文件访问接口

**请求:**
```
GET /:path(*)
```

**路径参数:**
- `path`: 相对于视频目录的文件路径

**示例:**
- `GET /videos/movie.mp4`
- `GET /videos/subfolder/clip.mp4`

**响应:**
- **成功**: 200 OK 或 206 Partial Content
  - `Content-Type`: 视频文件MIME类型
  - `Accept-Ranges`: bytes
  - `Content-Length`: 文件大小或范围大小
  - `Content-Range`: bytes start-end/total (Range请求时)

- **文件不存在**: 404 Not Found

- **非法路径**: 403 Forbidden

- **Range无效**: 416 Range Not Satisfiable

### 健康检查接口

**请求:**
```
GET /health
```

**响应:**
```json
{
  "status": "ok",
  "timestamp": "2026-03-24T10:30:00.000Z",
  "protocol": "https"
}
```

## 数据流

### 正常文件访问流程

1. 客户端发送GET请求
2. 安全中间件验证路径
3. 跨域隔离中间件添加COOP/COEP头(HTTPS时)
4. Range中间件检查Range头
5. 读取文件并流式传输
6. 返回响应

### Range请求流程

1. 客户端发送带Range头的请求: `Range: bytes=0-1024`
2. Range中间件解析Range参数
3. 验证Range是否有效
4. 创建文件读取流,定位到指定位置
5. 设置 `Content-Range` 和 `Content-Length`
6. 返回206状态码和部分内容

## 安全设计

### 路径安全
- 规范化路径,解析 `.` 和 `..`
- 验证最终路径是否在配置的视频目录内
- 使用Node.js的 `path.resolve()` 和 `path.relative()` 验证

### HTTPS安全
- 验证证书文件存在性
- 证书加载失败时回退到HTTP模式
- 使用TLS最佳实践(禁用不安全的加密算法)

### 访问控制
- 只支持GET请求,拒绝其他HTTP方法
- 防止访问配置文件和源代码
- 限制文件访问范围

## 性能优化

### 流式传输
- 使用 `fs.createReadStream()` 流式读取文件
- 不将整个文件加载到内存
- 支持大文件传输

### Range请求
- 支持视频边下边播
- 支持拖动播放进度条
- 支持断点续传

### 缓存策略
- 设置合理的 `Cache-Control` 头
- 支持浏览器缓存
- 减少重复请求

## 错误处理

### 配置错误
- 配置文件不存在: 使用默认配置,给出警告
- 配置格式错误: 解析失败,给出详细错误信息
- 必填字段缺失: 使用默认值或报错

### 运行时错误
- 端口被占用: 尝试其他端口或报错
- 文件访问权限错误: 返回403或500
- HTTPS证书错误: 回退到HTTP模式,记录日志

### 请求错误
- 文件不存在: 返回404
- 非法路径: 返回403
- Range无效: 返回416和 `Content-Range: */total`

### 视频列表页面接口

**请求:**
```
GET /videos.html
```

**响应:**
- 返回HTML页面,包含所有视频的列表
- 每个视频显示:文件名、路径、链接、复制按钮、播放按钮

**页面功能:**
- 自动扫描视频目录
- 显示视频文件名和相对路径
- 提供复制链接按钮
- 提供新标签页打开视频按钮
- 显示视频总数

## 部署说明

### 环境要求
- Node.js >= 14.0.0
- 依赖包: express, mime-types

### 安装步骤

1. 安装依赖:
```bash
npm install express mime-types
```

2. 创建配置文件 `config.json`

3. 启动服务:
```bash
node src/index.js
```

### 配置HTTPS

1. 生成自签名证书(开发环境):
```bash
openssl req -newkey rsa:2048 -nodes -keyout key.pem -x509 -days 365 -out cert.pem
```

2. 更新 `config.json`:
```json
{
  "server": {
    "https": {
      "enabled": true,
      "key": "./key.pem",
      "cert": "./cert.pem"
    }
  }
}
```

3. 重启服务

## 视频链接快速访问功能

### 控制台输出

服务启动时自动扫描视频目录,在控制台输出所有可用视频链接:

```
✓ 服务器已启动: http://localhost:3000
✓ HTTPS已启用
✓ 跨域隔离已配置
✓ 发现 3 个视频文件

📺 可用的视频链接:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. sample.mp4
   http://localhost:3000/videos/sample.mp4

2. subfolder/demo.mp4
   http://localhost:3000/videos/subfolder/demo.mp4

3. tutorial/lesson1.mp4
   http://localhost:3000/videos/tutorial/lesson1.mp4
```

### 网页列表页面

访问 `http://localhost:3000/videos.html` 查看视频列表:

**页面功能:**
- 显示所有视频文件
- 每个视频包含:
  - 文件图标和名称
  - 相对路径显示
  - 完整的访问链接
  - "复制链接"按钮(一键复制到剪贴板)
  - "播放视频"按钮(在新标签页打开)
- 统计信息:视频总数、目录结构

**HTML页面设计:**
```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>视频文件列表</title>
    <style>
        /* 简洁的样式设计 */
    </style>
</head>
<body>
    <h1>📺 视频文件列表</h1>
    <p>服务器: <span id="server-url"></span></p>
    <div id="video-list">
        <!-- 视频列表动态生成 -->
    </div>
    <script>
        // 复制链接功能
        function copyLink(url) {
            navigator.clipboard.writeText(url);
            alert('链接已复制!');
        }
    </script>
</body>
</html>
```

### 视频文件过滤

支持的视频格式:
- `.mp4`
- `.webm`
- `.ogg`
- `.mov`
- `.avi`
- `.mkv`
- `.flv`
- `.wmv`

可通过配置文件自定义支持的视频格式:

```json
{
  "videos": {
    "directory": "./videos",
    "allowedExtensions": [".mp4", ".webm", ".ogg", ".mov"]
  }
}
```

### 使用场景

1. **快速复制链接**: 服务启动后,直接从控制台复制需要的视频链接
2. **网页浏览访问**: 打开浏览器访问 `/videos.html`,点击"复制链接"按钮
3. **视频播放测试**: 点击"播放视频"按钮,在新标签页直接播放视频

## 测试策略

### 单元测试
- 配置管理器: 验证配置加载、默认值、错误处理
- 路径验证: 测试各种合法和非法路径
- Range解析: 测试各种Range格式

### 集成测试
- HTTP服务器启动和访问
- HTTPS服务器启动和访问
- Range请求响应
- 跨域隔离头配置

### 手动测试
- 浏览器访问视频文件
- 视频播放和拖动
- 检查Network面板的响应头
- 测试各种边界情况
- 测试视频列表页面 `/videos.html`
- 测试复制链接功能
- 测试视频扫描功能

## 视频链接快速访问功能

### 控制台输出

服务启动时自动扫描视频目录,在控制台输出所有可用视频链接:

```
✓ 服务器已启动: http://localhost:3000
✓ HTTPS已启用
✓ 跨域隔离已配置
✓ 发现 3 个视频文件

📺 可用的视频链接:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. sample.mp4
   http://localhost:3000/videos/sample.mp4

2. subfolder/demo.mp4
   http://localhost:3000/videos/subfolder/demo.mp4

3. tutorial/lesson1.mp4
   http://localhost:3000/videos/tutorial/lesson1.mp4
```

### 网页列表页面

访问 `http://localhost:3000/videos.html` 查看视频列表:

**页面功能:**
- 显示所有视频文件
- 每个视频包含:
  - 文件图标和名称
  - 相对路径显示
  - 完整的访问链接
  - "复制链接"按钮(一键复制到剪贴板)
  - "播放视频"按钮(在新标签页打开)
- 统计信息:视频总数、目录结构

**HTML页面设计:**
```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>视频文件列表</title>
    <style>
        /* 简洁的样式设计 */
    </style>
</head>
<body>
    <h1>📺 视频文件列表</h1>
    <p>服务器: <span id="server-url"></span></p>
    <div id="video-list">
        <!-- 视频列表动态生成 -->
    </div>
    <script>
        // 复制链接功能
        function copyLink(url) {
            navigator.clipboard.writeText(url);
            alert('链接已复制!');
        }
    </script>
</body>
</html>
```

### 视频文件过滤

支持的视频格式:
- `.mp4`
- `.webm`
- `.ogg`
- `.mov`
- `.avi`
- `.mkv`
- `.flv`
- `.wmv`

可通过配置文件自定义支持的视频格式:

```json
{
  "videos": {
    "directory": "./videos",
    "allowedExtensions": [".mp4", ".webm", ".ogg", ".mov"]
  }
}
```

### 使用场景

1. **快速复制链接**: 服务启动后,直接从控制台复制需要的视频链接
2. **网页浏览访问**: 打开浏览器访问 `/videos.html`,点击"复制链接"按钮
3. **视频播放测试**: 点击"播放视频"按钮,在新标签页直接播放视频

## 视频链接快速访问功能

### 控制台输出

服务启动时自动扫描视频目录,在控制台输出所有可用视频链接:

```
✓ 服务器已启动: http://localhost:3000
✓ HTTPS已启用
✓ 跨域隔离已配置
✓ 发现 3 个视频文件

📺 可用的视频链接:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. sample.mp4
   http://localhost:3000/videos/sample.mp4

2. subfolder/demo.mp4
   http://localhost:3000/videos/subfolder/demo.mp4

3. tutorial/lesson1.mp4
   http://localhost:3000/videos/tutorial/lesson1.mp4
```

### 网页列表页面

访问 `http://localhost:3000/videos.html` 查看视频列表:

**页面功能:**
- 显示所有视频文件
- 每个视频包含:
  - 文件图标和名称
  - 相对路径显示
  - 完整的访问链接
  - "复制链接"按钮(一键复制到剪贴板)
  - "播放视频"按钮(在新标签页打开)
- 统计信息:视频总数、目录结构

**HTML页面设计:**
```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>视频文件列表</title>
    <style>
        /* 简洁的样式设计 */
    </style>
</head>
<body>
    <h1>📺 视频文件列表</h1>
    <p>服务器: <span id="server-url"></span></p>
    <div id="video-list">
        <!-- 视频列表动态生成 -->
    </div>
    <script>
        // 复制链接功能
        function copyLink(url) {
            navigator.clipboard.writeText(url);
            alert('链接已复制!');
        }
    </script>
</body>
</html>
```

### 视频文件过滤

支持的视频格式:
- `.mp4`
- `.webm`
- `.ogg`
- `.mov`
- `.avi`
- `.mkv`
- `.flv`
- `.wmv`

可通过配置文件自定义支持的视频格式:

```json
{
  "videos": {
    "directory": "./videos",
    "allowedExtensions": [".mp4", ".webm", ".ogg", ".mov"]
  }
}
```

### 使用场景

1. **快速复制链接**: 服务启动后,直接从控制台复制需要的视频链接
2. **网页浏览访问**: 打开浏览器访问 `/videos.html`,点击"复制链接"按钮
3. **视频播放测试**: 点击"播放视频"按钮,在新标签页直接播放视频

## 扩展性考虑

### 未来可能的扩展
- 访问日志记录
- 视频缩略图生成
- 视频元信息查询
- 访问控制和认证
- 视频转码功能

### 扩展点
- 中间件机制: 添加新的中间件
- 配置系统: 扩展配置选项
- 路由系统: 添加新的API端点

## 项目结构

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
│   └── (视频文件)
├── test/                          # 测试文件
│   ├── config.test.js
│   ├── utils/
│   │   └── videoScanner.test.js   # 视频扫描测试
│   ├── middleware/
│   │   ├── range.test.js
│   │   ├── cors.test.js
│   │   └── security.test.js
│   └── integration.test.js
└── README.md                      # 使用说明
```

## 总结

本设计提供了一个轻量级、安全、高性能的视频共享服务,满足本地开发/测试环境的快速视频文件共享需求。关键特性包括:

- 支持HTTP/HTTPS双协议
- HTTPS环境下自动配置跨域隔离
- 支持Range请求,优化视频播放
- 完善的安全措施
- 灵活的配置系统
- 流式传输,性能优秀
- **快速获取视频链接**: 控制台输出 + 网页列表页面
- **一键复制链接**: 方便快速分享视频链接

该设计实现了YAGNI原则,只包含必要的功能,避免过度设计,同时为未来扩展预留了接口。
