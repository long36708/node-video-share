# WebSocket 视频流使用指南

## 概述

本项目现在支持通过WebSocket协议传输视频文件，除了原有的HTTP/HTTPS方式外，您还可以使用`ws://`或`wss://`地址来访问视频。

## 启动服务器

```bash
pnpm start
```

服务器启动后，会同时提供HTTP和WebSocket两种访问方式：
- HTTP: `http://localhost:3000`
- WebSocket: `ws://localhost:3000`

如果启用了HTTPS：
- HTTPS: `https://localhost:3000`
- WSS: `wss://localhost:3000`

## WebSocket 视频地址格式

```
ws://localhost:3000/ws/videos/{视频相对路径}
```

例如：
- `ws://localhost:3000/ws/videos/sample.mp4`
- `ws://localhost:3000/ws/videos/subfolder/video.mp4`

## 使用方式

### 1. 通过Web页面查看

访问 `http://localhost:3000/videos.html`，页面会显示：
- HTTP视频列表（原有功能）
- WebSocket视频列表（新增功能）

每个WebSocket视频都有：
- 复制WS地址按钮
- 测试WS连接按钮

### 2. 使用测试客户端

项目提供了一个Node.js WebSocket客户端测试脚本：

```bash
# 使用默认参数（下载 sample.mp4）
pnpm ws-client

# 指定视频路径和输出文件
pnpm ws-client ws://localhost:3000/ws/videos/myvideo.mp4 ./output.mp4

# 或直接运行
node test-ws-client.js ws://localhost:3000/ws/videos/sample.mp4 ./received.mp4
```

### 3. 在浏览器中使用

```javascript
// 创建WebSocket连接
const ws = new WebSocket('ws://localhost:3000/ws/videos/sample.mp4');

// 接收元数据
ws.onmessage = (event) => {
  if (typeof event.data === 'string') {
    // JSON元数据
    const metadata = JSON.parse(event.data);
    console.log('Video metadata:', metadata);
  } else {
    // 二进制视频数据
    console.log('Received video chunk:', event.data.byteLength, 'bytes');
    // 可以将数据传递给MediaSource Extensions进行播放
  }
};

ws.onopen = () => {
  console.log('Connected to WebSocket video server');
};

ws.onerror = (error) => {
  console.error('WebSocket error:', error);
};

ws.onclose = () => {
  console.log('Connection closed');
};
```

### 4. 使用MediaSource Extensions播放

```javascript
const ws = new WebSocket('ws://localhost:3000/ws/videos/sample.mp4');
const mediaSource = new MediaSource();
const video = document.createElement('video');
video.src = URL.createObjectURL(mediaSource);

mediaSource.addEventListener('sourceopen', () => {
  const sourceBuffer = mediaSource.addSourceBuffer('video/mp4');
  
  ws.onmessage = (event) => {
    if (typeof event.data !== 'string') {
      // 接收二进制数据并添加到缓冲区
      sourceBuffer.appendBuffer(event.data);
    }
  };
});

document.body.appendChild(video);
video.play();
```

## WebSocket消息协议

### 服务器发送的消息类型

1. **元数据消息** (JSON字符串)
```json
{
  "type": "metadata",
  "size": 1234567,
  "contentType": "video/mp4",
  "name": "sample.mp4"
}
```

2. **结束消息** (JSON字符串)
```json
{
  "type": "end"
}
```

3. **错误消息** (JSON字符串)
```json
{
  "type": "error",
  "message": "File not found"
}
```

4. **视频数据** (Binary)
   - 以64KB分片发送的视频数据
   - 二进制格式

## 特性

- ✅ 支持所有视频格式（mp4, webm, ogg, mov, avi, mkv等）
- ✅ 自动分片传输（64KB/chunk）
- ✅ 发送前验证文件存在性
- ✅ 完整的错误处理
- ✅ 支持子目录视频
- ✅ 与HTTP服务并行运行
- ✅ 自动检测HTTPS/WSS协议

## 注意事项

1. **浏览器兼容性**: WebSocket在现代浏览器中广泛支持
2. **跨域**: WebSocket不受同源策略限制，但仍需注意CORS配置
3. **性能**: 对于大视频文件，建议使用HTTP Range请求以获得更好的seek体验
4. **安全性**: 生产环境建议启用HTTPS/WSS

## 故障排除

### 连接失败
- 检查服务器是否正在运行
- 确认视频路径是否正确
- 检查防火墙设置

### 接收不到数据
- 查看浏览器控制台错误信息
- 检查服务器日志
- 确认视频文件存在且可读

### 视频无法播放
- WebSocket传输的是原始数据，需要使用MediaSource Extensions进行播放
- 确保视频格式受浏览器支持
- 检查MIME类型是否正确

## 示例代码

完整的浏览器端播放器示例请参考项目中的测试页面或使用`videos.html`页面进行测试。
