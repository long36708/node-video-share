import { createReadStream } from 'fs';
import { stat, access } from 'fs/promises';
import { join } from 'path';
import { lookup } from 'mime-types';

/**
 * WebSocket视频流处理器
 * 通过WebSocket传输视频数据分片
 */
export function setupWebSocketVideoHandler(wss, config) {
  wss.on('connection', (ws, req) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const pathname = url.pathname;

    // 匹配 /ws/videos/* 路径
    if (pathname.startsWith('/ws/videos/')) {
      handleVideoStream(ws, pathname, config);
    } else {
      ws.close(1008, 'Invalid path');
    }
  });
}

async function handleVideoStream(ws, pathname, config) {
  try {
    // 提取视频路径
    const videoPath = decodeURIComponent(pathname.replace('/ws/videos/', ''));
    const fullPath = join(config.videos.directory, videoPath);

    console.log(`WebSocket video request: ${videoPath}`);

    // 验证文件是否存在
    try {
      await access(fullPath);
    } catch (error) {
      ws.send(JSON.stringify({
        type: 'error',
        message: 'File not found',
        path: videoPath
      }));
      ws.close(1008, 'File not found');
      return;
    }

    // 获取文件信息
    const fileStats = await stat(fullPath);
    const contentType = lookup(fullPath) || 'application/octet-stream';

    // 发送文件元数据
    ws.send(JSON.stringify({
      type: 'metadata',
      size: fileStats.size,
      contentType: contentType,
      name: videoPath.split('/').pop()
    }));

    // 分块读取并发送视频数据
    const CHUNK_SIZE = 64 * 1024; // 64KB chunks
    let offset = 0;

    const sendChunk = () => {
      if (offset >= fileStats.size) {
        ws.send(JSON.stringify({ type: 'end' }));
        ws.close(1000, 'Transmission complete');
        return;
      }

      const remaining = fileStats.size - offset;
      const chunkSize = Math.min(CHUNK_SIZE, remaining);
      const end = offset + chunkSize - 1;

      const stream = createReadStream(fullPath, {
        start: offset,
        end: end
      });

      let chunks = [];
      stream.on('data', (chunk) => {
        chunks.push(chunk);
      });

      stream.on('end', () => {
        const buffer = Buffer.concat(chunks);
        
        // 发送二进制数据
        ws.send(buffer, { binary: true }, (err) => {
          if (err) {
            console.error('Error sending chunk:', err);
            ws.close(1011, 'Transmission error');
            return;
          }

          offset += chunkSize;
          
          // 继续发送下一个分片
          setImmediate(sendChunk);
        });
      });

      stream.on('error', (error) => {
        console.error('Error reading file:', error);
        ws.send(JSON.stringify({
          type: 'error',
          message: 'File read error'
        }));
        ws.close(1011, 'File read error');
      });
    };

    // 开始发送数据
    sendChunk();

  } catch (error) {
    console.error('WebSocket video handler error:', error);
    ws.send(JSON.stringify({
      type: 'error',
      message: 'Internal server error'
    }));
    ws.close(1011, 'Internal error');
  }
}

/**
 * 生成WebSocket视频URL
 */
export function generateWsVideoUrl(baseUrl, videoPath, secure = false) {
  const protocol = secure ? 'wss' : 'ws';
  const host = baseUrl.replace(/^https?:\/\//, '');
  const encodedPath = encodeURIComponent(videoPath);
  return `${protocol}://${host}/ws/videos/${encodedPath}`;
}
