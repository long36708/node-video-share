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

export async function scanVideos(directory, baseUrl = '', allowedExtensions = DEFAULT_EXTENSIONS) {
  const videos = [];
  const rootDir = directory;
  await scanDirectory(directory, rootDir, baseUrl, allowedExtensions, videos);
  return videos.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
}

async function scanDirectory(directory, rootDir, baseUrl, allowedExtensions, videos) {
  const files = await readdir(directory, { withFileTypes: true });

  for (const file of files) {
    const fullPath = join(directory, file.name);

    if (file.isDirectory()) {
      await scanDirectory(fullPath, rootDir, baseUrl, allowedExtensions, videos);
    } else if (file.isFile()) {
      const ext = extname(file.name).toLowerCase();
      if (allowedExtensions.includes(ext)) {
        const relativePath = relative(rootDir, fullPath);
        const normalizedPath = relativePath.replace(/\\/g, '/');
        const encodedPath = encodePathSegments(normalizedPath);

        videos.push({
          name: file.name,
          relativePath: normalizedPath,
          path: fullPath,
          url: baseUrl ? `${baseUrl}/videos/${encodedPath}` : null
        });
      }
    }
  }
}
