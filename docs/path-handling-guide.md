# Node.js 视频服务 - 路径处理问题与修复经验

## 问题背景

在 Node.js 视频共享服务中，涉及多种路径场景：中文路径、嵌套目录、绝对路径、Windows 反斜杠等。以下是实际踩坑和修复的总结。

---

## 1. 中文路径 URL 编码/解码

### 问题

中文文件名或目录名直接拼接到 URL 中，浏览器可能无法正确访问：

```
http://localhost:3000/videos/中文视频/测试.mp4  // 可能失败
```

### 修复

**生成 URL 时编码** (`videoScanner.js`)：

```javascript
function encodePathSegments(path) {
  return path
    .split('/')
    .map(segment => encodeURIComponent(segment))
    .join('/');
}

// 结果: /videos/%E4%B8%AD%E6%96%87%E8%A7%86%E9%A2%91/%E6%B5%8B%E8%AF%95.mp4
```

**接收请求时解码** (`security.js`)：

```javascript
function decodePathSegments(path) {
  return path
    .split('/')
    .map(segment => decodeURIComponent(segment))
    .join('/');
}
```

> 关键：路径分段编码，不要整个路径一起编码，否则 `/` 也会被编码。

---

## 2. 递归扫描丢失父目录路径

### 问题

`scanVideos()` 递归扫描子目录时，`relative()` 基于当前子目录计算，导致丢失父级路径：

```javascript
// 错误：递归时 directory 变成了子目录
const relativePath = relative(directory, fullPath);
// 扫描 videos/subfolder/video.mp4 时，directory = "videos/subfolder"
// relative() 返回 "video.mp4"，丢失了 "subfolder/"
```

### 修复

提取内部递归函数，始终保留根目录引用：

```javascript
export async function scanVideos(directory, baseUrl = '', allowedExtensions = DEFAULT_EXTENSIONS) {
  const videos = [];
  const rootDir = directory;  // 保存根目录
  await scanDirectory(directory, rootDir, baseUrl, allowedExtensions, videos);
  return videos.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
}

async function scanDirectory(directory, rootDir, baseUrl, allowedExtensions, videos) {
  // ...
  const relativePath = relative(rootDir, fullPath);  // 始终相对于根目录
  // ...
}
```

---

## 3. Express 中间件中 `req.path` 的陷阱

### 问题

Express 中间件挂载在 `/videos` 下时，`req.path` 返回的是**相对于挂载点**的路径，而非完整路径：

```javascript
app.use('/videos', myMiddleware);
// 请求 GET /videos/test.mp4
// req.path = "/test.mp4"  (不是 "/videos/test.mp4")
```

在 Windows 上 `normalize('/test.mp4')` 会变成 `\test.mp4`，以反斜杠开头的路径被 `resolve()` 视为绝对路径，导致文件路径解析错误。

### 修复

```javascript
const cleanPath = requestPath.startsWith('/')
  ? requestPath.slice(1)   // 去掉前导 /
  : requestPath;
const normalizedPath = normalize(cleanPath);
```

---

## 4. Windows 路径安全检查

### 问题

`path.resolve()` 在 Windows 上会将 `\` 开头的路径视为根路径：

```javascript
resolve('D:\\00video-media', '\\test.mp4')
// 结果: D:\test.mp4  (错误！应该是 D:\00video-media\test.mp4)
```

### 修复

安全中间件需要检查多种绝对路径形式：

```javascript
if (normalizedPath.includes('..') ||          // 路径遍历
    normalizedPath.startsWith('/') ||          // Unix 绝对路径
    normalizedPath.startsWith('\\') ||         // Windows 反斜杠绝对路径
    /^[a-zA-Z]:/.test(normalizedPath)) {      // Windows 盘符路径 D:\
  return res.status(403);
}
```

---

## 5. 绝对路径与 `path.resolve()` 的拼接

### 问题

`path.resolve()` 遇到绝对路径参数时会忽略前面的基础路径：

```javascript
resolve('/project/src', '../', 'D:\\00video-media')
// 结果: D:\00video-media  (忽略了前面的路径)
```

但这在当前场景下其实是正确行为。需要注意 `resolve()` 的特性：**遇到绝对路径会重置基准**。

### 建议

如果配置支持绝对路径，直接 `resolve(config.videos.directory)` 即可，无需拼接项目路径：

```javascript
// 不需要
const videoDir = resolve(__dirname, '../', config.videos.directory);

// 直接
const videoDir = resolve(config.videos.directory);
```

---

## 经验总结

| 场景 | 关键点 |
|---|---|
| 中文路径 | URL 编码/解码要分段处理，保留 `/` |
| 递归扫描 | `relative()` 始终基于根目录，不要基于当前递归目录 |
| Express `req.path` | 相对于中间件挂载路径，去掉前导 `/` 再 `normalize()` |
| Windows 安全检查 | 同时检查 `..`、`/`、`\`、盘符 |
| `path.resolve()` | 遇到绝对路径会重置基准，不是追加 |
