import { resolve, normalize, relative } from 'path';

export function securityMiddleware(videoDirectory) {
  const resolvedVideoDir = resolve(videoDirectory);

  return (req, res, next) => {
    const requestPath = req.path;

    const normalizedPath = normalize(requestPath);

    if (normalizedPath.includes('..') || normalizedPath.startsWith('/')) {
      return res.status(403).json({ error: 'Access denied: invalid path' });
    }

    const fullPath = resolve(resolvedVideoDir, requestPath.substring(1));
    const relativePath = relative(resolvedVideoDir, fullPath);

    if (relativePath.startsWith('..')) {
      return res.status(403).json({ error: 'Access denied: path outside video directory' });
    }

    req.filePath = fullPath;
    next();
  };
}
