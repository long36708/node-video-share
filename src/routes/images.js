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
