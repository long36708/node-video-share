import { scanVideos } from '../utils/videoScanner.js';

export function wsVideosRoute(config) {
  return async (req, res) => {
    try {
      const protocol = req.secure ? 'https' : 'http';
      const host = req.get('host');
      const baseUrl = `${protocol}://${host}`;

      const wsVideos = await scanVideos(config.videos.directory, baseUrl, config.videos.allowedExtensions, true);

      const html = generateWsVideosHtml(baseUrl, wsVideos);
      res.send(html);
    } catch (error) {
      res.status(500).json({ error: 'Failed to scan videos' });
    }
  };
}

function generateWsVideosHtml(baseUrl, wsVideos) {
  const videoListHtml = wsVideos.map(video =>
    `            <div class="video-item">
                <div class="video-info">
                    <div class="video-name">
                        <span class="icon">🎬</span>${video.name}
                        <span class="video-type">WebSocket</span>
                    </div>
                    <div class="video-path">📁 ${video.relativePath}</div>
                    <div class="video-link">${video.wsUrl}</div>
                </div>
                <div class="video-actions">
                    <button class="btn btn-copy" onclick="copyLink('${video.wsUrl}', this)">复制WS地址</button>
                    <button class="btn btn-play" onclick="playWsVideo('${video.wsUrl}')">测试WS连接</button>
                </div>
            </div>`
  ).join('\n');

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>WebSocket视频列表</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            background: #f5f5f5;
        }
        h1 { color: #333; margin-bottom: 10px; font-size: 28px; }
        .server-info {
            color: #666; margin-bottom: 20px; padding: 10px;
            background: white; border-radius: 8px; border-left: 4px solid #1976D2;
        }
        .stats { color: #666; margin-bottom: 20px; }
        .section-title {
            color: #333; margin: 30px 0 15px 0; font-size: 20px;
            padding-bottom: 8px; border-bottom: 2px solid #e0e0e0;
        }
        .video-list { display: grid; gap: 15px; }
        .video-item {
            background: white; padding: 15px; border-radius: 8px;
            display: flex; align-items: center; justify-content: space-between;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1); transition: box-shadow 0.2s;
            border-left: 4px solid #1976D2;
        }
        .video-item:hover { box-shadow: 0 4px 8px rgba(0,0,0,0.15); }
        .video-info { flex: 1; margin-right: 20px; }
        .video-name { font-weight: 600; color: #333; margin-bottom: 5px; font-size: 16px; }
        .video-path { color: #888; font-size: 14px; margin-bottom: 8px; }
        .video-link { color: #1976D2; font-size: 12px; word-break: break-all; }
        .video-type {
            display: inline-block; padding: 2px 8px; border-radius: 4px;
            font-size: 12px; margin-left: 8px; background: #E3F2FD; color: #1976D2;
        }
        .video-actions { display: flex; gap: 10px; }
        .btn {
            padding: 8px 16px; border: none; border-radius: 4px;
            cursor: pointer; font-size: 14px; transition: background 0.2s;
        }
        .btn-copy { background: #4CAF50; color: white; }
        .btn-copy:hover { background: #45a049; }
        .btn-play { background: #1976D2; color: white; }
        .btn-play:hover { background: #1565C0; }
        .empty-state { text-align: center; padding: 40px; color: #888; font-size: 16px; }
        .icon { font-size: 24px; margin-right: 10px; }
        .nav-link { display: inline-block; margin-bottom: 20px; color: #2196F3; text-decoration: none; }
        .nav-link:hover { text-decoration: underline; }
    </style>
</head>
<body>
    <a class="nav-link" href="/videos.html">← 返回HTTP视频列表</a>
    <h1>🔌 WebSocket视频列表</h1>
    <div class="server-info">
        <strong>服务器:</strong> ${baseUrl}
    </div>
    <div class="stats">
        WebSocket视频: <strong>${wsVideos.length}</strong> 个
    </div>

    <div class="video-list">
        ${wsVideos.length === 0 ? '<div class="empty-state">暂无WebSocket视频</div>' : ''}
        ${videoListHtml}
    </div>
    <script>
        function copyLink(url, button) {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(url).then(function() {
                    var originalText = button.textContent;
                    button.textContent = '已复制!';
                    button.style.background = '#45a049';
                    setTimeout(function() {
                        button.textContent = originalText;
                        button.style.background = '#4CAF50';
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
                button.style.background = '#45a049';
                setTimeout(function() {
                    button.textContent = originalText;
                    button.style.background = '#4CAF50';
                }, 2000);
            } catch (err) {
                alert('复制失败: ' + err);
            }
            document.body.removeChild(textArea);
        }

        function playWsVideo(wsUrl) {
            var ws = new WebSocket(wsUrl);
            ws.onopen = function() {
                alert('WebSocket连接成功！\\n地址: ' + wsUrl);
                ws.close();
            };
            ws.onerror = function() {
                alert('WebSocket连接失败: ' + wsUrl);
            };
        }
    </script>
</body>
</html>`;
}
