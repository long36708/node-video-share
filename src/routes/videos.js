import { scanVideos } from '../utils/videoScanner.js';

export function videosRoute(config) {
  return async (req, res) => {
    try {
      const protocol = req.secure ? 'https' : 'http';
      const host = req.get('host');
      const baseUrl = `${protocol}://${host}`;
      const videos = await scanVideos(config.videos.directory, baseUrl, config.videos.allowedExtensions);

      // 获取远程视频列表及其代理地址
      const remoteVideos = (config.videos.remoteVideos || []).map(video => ({
        ...video,
        proxyUrl: `${baseUrl}/proxy/${video.id}`
      }));

      const html = generateVideosHtml(baseUrl, videos, remoteVideos);
      res.send(html);
    } catch (error) {
      res.status(500).json({ error: 'Failed to scan videos' });
    }
  };
}

function generateVideosHtml(baseUrl, videos, remoteVideos = []) {
  const allVideos = [
    ...videos.map(v => ({ ...v, type: 'local' })),
    ...remoteVideos.map(v => ({ ...v, type: 'remote' }))
  ];

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>视频文件列表</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 1200px;
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
            border-left: 4px solid #4CAF50;
        }
        .stats {
            color: #666;
            margin-bottom: 20px;
        }
        .section-title {
            color: #333;
            margin: 30px 0 15px 0;
            font-size: 20px;
            padding-bottom: 8px;
            border-bottom: 2px solid #e0e0e0;
        }
        .video-list {
            display: grid;
            gap: 15px;
        }
        .video-item {
            background: white;
            padding: 15px;
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            transition: box-shadow 0.2s;
        }
        .video-item:hover {
            box-shadow: 0 4px 8px rgba(0,0,0,0.15);
        }
        .video-item.remote {
            border-left: 4px solid #FF9800;
        }
        .video-item.local {
            border-left: 4px solid #4CAF50;
        }
        .video-info {
            flex: 1;
            margin-right: 20px;
        }
        .video-name {
            font-weight: 600;
            color: #333;
            margin-bottom: 5px;
            font-size: 16px;
        }
        .video-path {
            color: #888;
            font-size: 14px;
            margin-bottom: 8px;
        }
        .video-link {
            color: #2196F3;
            font-size: 12px;
            word-break: break-all;
        }
        .video-type {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 12px;
            margin-left: 8px;
        }
        .video-type.remote {
            background: #FFF3E0;
            color: #E65100;
        }
        .video-type.local {
            background: #E8F5E9;
            color: #2E7D32;
        }
        .video-actions {
            display: flex;
            gap: 10px;
        }
        .btn {
            padding: 8px 16px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            transition: background 0.2s;
        }
        .btn-copy {
            background: #4CAF50;
            color: white;
        }
        .btn-copy:hover {
            background: #45a049;
        }
        .btn-play {
            background: #2196F3;
            color: white;
        }
        .btn-play:hover {
            background: #0b7dda;
        }
        .empty-state {
            text-align: center;
            padding: 40px;
            color: #888;
            font-size: 16px;
        }
        .icon {
            font-size: 24px;
            margin-right: 10px;
        }
    </style>
</head>
<body>
    <h1>📺 视频文件列表</h1>
    <div class="server-info">
        <strong>服务器:</strong> ${baseUrl}
    </div>
    <div class="stats">
        本地视频: <strong>${videos.length}</strong> 个 | 
        远程视频: <strong>${remoteVideos.length}</strong> 个 | 
        总计: <strong>${allVideos.length}</strong> 个
    </div>

    ${remoteVideos.length > 0 ? `
    <h2 class="section-title">🌐 远程视频（通过代理访问，无跨域限制）</h2>
    <div class="video-list">
        ${remoteVideos.map(video => `
            <div class="video-item remote">
                <div class="video-info">
                    <div class="video-name">
                        <span class="icon">🎬</span>${video.name}
                        <span class="video-type remote">远程</span>
                    </div>
                    <div class="video-path">原始地址: ${video.url}</div>
                    <div class="video-link">代理地址: ${video.proxyUrl}</div>
                </div>
                <div class="video-actions">
                    <button class="btn btn-copy" onclick="copyLink('${video.proxyUrl}', this)">复制代理地址</button>
                    <button class="btn btn-play" onclick="playVideo('${video.proxyUrl}')">播放视频</button>
                </div>
            </div>
        `).join('')}
    </div>
    ` : ''}

    <h2 class="section-title">💻 本地视频</h2>
    <div class="video-list">
        ${videos.length === 0 && remoteVideos.length === 0 ? '<div class="empty-state">没有找到视频文件</div>' : ''}
        ${videos.length === 0 && remoteVideos.length > 0 ? '<div class="empty-state">暂无本地视频</div>' : ''}
        ${videos.map(video => `
            <div class="video-item local">
                <div class="video-info">
                    <div class="video-name">
                        <span class="icon">🎬</span>${video.name}
                        <span class="video-type local">本地</span>
                    </div>
                    <div class="video-path">📁 ${video.relativePath}</div>
                    <div class="video-link">${video.url}</div>
                </div>
                <div class="video-actions">
                    <button class="btn btn-copy" onclick="copyLink('${video.url}', this)">复制链接</button>
                    <button class="btn btn-play" onclick="playVideo('${video.url}')">播放视频</button>
                </div>
            </div>
        `).join('')}
    </div>
    <script>
        function copyLink(url, button) {
            navigator.clipboard.writeText(url).then(() => {
                const btn = button;
                const originalText = btn.textContent;
                btn.textContent = '已复制!';
                btn.style.background = '#45a049';
                setTimeout(() => {
                    btn.textContent = originalText;
                    btn.style.background = '#4CAF50';
                }, 2000);
            }).catch(err => {
                alert('复制失败: ' + err);
            });
        }

        function playVideo(url) {
            window.open(url, '_blank');
        }
    </script>
</body>
</html>`;
}
