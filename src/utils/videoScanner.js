import { readdir, stat } from 'fs/promises';
import { join, extname, relative } from 'path';

const DEFAULT_EXTENSIONS = ['.mp4', '.webm', '.ogg', '.mov', '.avi', '.mkv', '.flv', '.wmv'];

export async function scanVideos(directory, baseUrl = '', allowedExtensions = DEFAULT_EXTENSIONS) {
  const videos = [];
  const files = await readdir(directory, { withFileTypes: true });

  for (const file of files) {
    const fullPath = join(directory, file.name);

    if (file.isDirectory()) {
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
