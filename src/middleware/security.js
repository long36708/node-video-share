import { resolve, normalize, relative } from 'path';

function decodePathSegments(path) {
  // 对路径的每个部分单独解码
  return path
    .split('/')
    .map(segment => decodeURIComponent(segment))
    .join('/');
}

export function securityMiddleware(videoDirectory) {
  const resolvedVideoDir = resolve(videoDirectory);

  return (req, res, next) => {
    const requestPath = req.path;

    // req.path 是相对于中间件挂载路径的，可能是 /wrong-duration-wrong-nb_samples.mp4
    // 去掉前导斜杠
    const cleanPath = requestPath.startsWith('/')
      ? requestPath.slice(1)
      : requestPath;

    console.log(`[Security] requestPath: "${requestPath}"`);
    console.log(`[Security] cleanPath: "${cleanPath}"`);

    // 解码 URL 编码的路径(支持中文)
    const decodedPath = decodePathSegments(cleanPath);
    console.log(`[Security] decodedPath: "${decodedPath}"`);

    // 规范化路径并确保不是绝对路径
    const normalizedPath = normalize(decodedPath);
    console.log(`[Security] normalizedPath: "${normalizedPath}"`);

    // 检查是否包含 .. (路径遍历)
    if (normalizedPath.includes('..')) {
      console.log(`[Security] 403 - Contains ..`);
      return res.status(403).json({ error: 'Access denied: invalid path' });
    }

    // 检查是否以 / 或 \ 开头 (绝对路径)
    if (normalizedPath.startsWith('/') || normalizedPath.startsWith('\\')) {
      console.log(`[Security] 403 - Starts with / or \\`);
      return res.status(403).json({ error: 'Access denied: invalid path' });
    }

    // 检查是否以盘符开头 (Windows 绝对路径)
    if (/^[a-zA-Z]:/.test(normalizedPath)) {
      console.log(`[Security] 403 - Starts with drive letter`);
      return res.status(403).json({ error: 'Access denied: invalid path' });
    }

    const fullPath = resolve(resolvedVideoDir, normalizedPath);
    const relativePath = relative(resolvedVideoDir, fullPath);

    console.log(`[Security] fullPath: "${fullPath}"`);
    console.log(`[Security] relativePath: "${relativePath}"`);

    if (relativePath.startsWith('..')) {
      console.log(`[Security] 403 - Path outside video directory`);
      return res.status(403).json({ error: 'Access denied: path outside video directory' });
    }

    console.log(`[Security] ✓ Access granted: ${fullPath}`);
    req.filePath = fullPath;
    next();
  };
}
