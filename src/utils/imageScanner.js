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
