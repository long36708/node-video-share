import { readdir, stat } from 'fs/promises';
import { join, extname, relative } from 'path';

const DEFAULT_EXTENSIONS = ['.mp4', '.webm', '.ogg', '.mov', '.avi', '.mkv', '.flv', '.wmv'];

function encodePathSegments(path) {
  // 对路径的每个部分单独编码,保留路径分隔符
  return path
    .split('/')
    .map(segment => encodeURIComponent(segment))
    .join('/');
}

export async function scanVideos(directory, baseUrl = '', allowedExtensions = DEFAULT_EXTENSIONS, useWebSocket = false) {
  const videos = [];
  const rootDir = directory;
  await scanDirectory(directory, rootDir, baseUrl, allowedExtensions, videos, useWebSocket);
  return videos.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
}

async function scanDirectory(directory, rootDir, baseUrl, allowedExtensions, videos, useWebSocket = false) {
  const files = await readdir(directory, { withFileTypes: true });

  for (const file of files) {
    const fullPath = join(directory, file.name);

    if (file.isDirectory()) {
      await scanDirectory(fullPath, rootDir, baseUrl, allowedExtensions, videos, useWebSocket);
    } else if (file.isFile()) {
      const ext = extname(file.name).toLowerCase();
      if (allowedExtensions.includes(ext)) {
        const relativePath = relative(rootDir, fullPath);
        const normalizedPath = relativePath.replace(/\\/g, '/');
        const encodedPath = encodePathSegments(normalizedPath);

        // 根据useWebSocket参数生成不同的URL
        let url = null;
        if (baseUrl) {
          if (useWebSocket) {
            // 生成ws://或wss://地址
            const protocol = baseUrl.startsWith('https') ? 'wss' : 'ws';
            const host = baseUrl.replace(/^https?:\/\//, '');
            url = `${protocol}://${host}/ws/videos/${encodedPath}`;
          } else {
            // 生成http://或https://地址
            const protocol = baseUrl.startsWith('https') ? 'https' : 'http';
            url = `${protocol}://${baseUrl.replace(/^https?:\/\//, '')}/videos/${encodedPath}`;
          }
        }

        videos.push({
          name: file.name,
          relativePath: normalizedPath,
          path: fullPath,
          url: url,
          wsUrl: useWebSocket ? url : null,
          httpUrl: !useWebSocket ? url : null
        });
      }
    }
  }
}
