import { resolve } from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';
import { loadConfig } from './config.js';
import { VideoServer } from './server.js';
import { scanVideos } from './utils/videoScanner.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = resolve(__filename, '..');

async function main() {
  try {
    const configPath = resolve(__dirname, '../config.json');
    const config = await loadConfig(configPath);

    const server = new VideoServer(config);

    await server.start();

    const protocol = config.server.https.enabled ? 'https' : 'http';
    const port = config.server.port;
    const baseUrl = `${protocol}://localhost:${port}`;

    console.log(chalk.green('✓ 服务器已启动:'), chalk.cyan(baseUrl));
    console.log(chalk.green('✓ 视频目录:'), chalk.cyan(resolve(__dirname, '../', config.videos.directory)));

    if (config.server.https.enabled) {
      console.log(chalk.green('✓ HTTPS已启用'));
    }

    if (config.security.enableCorsIsolation && config.server.https.enabled) {
      console.log(chalk.green('✓ 跨域隔离已配置'));
      console.log(chalk.gray('  COOP:'), chalk.cyan(config.security.coop));
      console.log(chalk.gray('  COEP:'), chalk.cyan(config.security.coep));
    }

    const videoDir = resolve(__dirname, '../', config.videos.directory);
    const videos = await scanVideos(videoDir, baseUrl, config.videos.allowedExtensions);

    if (videos.length > 0) {
      console.log(chalk.green(`✓ 发现 ${videos.length} 个视频文件`));
      console.log('');
      console.log(chalk.yellow('📺 可用的视频链接:'));
      console.log(chalk.gray('━'.repeat(50)));

      videos.forEach((video, index) => {
        console.log(chalk.white(`${index + 1}. ${video.relativePath}`));
        console.log(chalk.cyan(`   ${video.url}`));
        console.log('');
      });
    } else {
      console.log(chalk.yellow('⚠ 未找到视频文件'));
      console.log(chalk.gray(`  请将视频文件放置在: ${videoDir}`));
    }

    console.log('');
    console.log(chalk.yellow('访问视频列表页面:'), chalk.cyan(`${baseUrl}/videos.html`));
    console.log('');

    process.on('SIGTERM', async () => {
      console.log(chalk.yellow('Received SIGTERM, shutting down...'));
      await server.stop();
      process.exit(0);
    });

    process.on('SIGINT', async () => {
      console.log(chalk.yellow('Received SIGINT, shutting down...'));
      await server.stop();
      process.exit(0);
    });

  } catch (error) {
    console.error(chalk.red('Failed to start server:'), error);
    process.exit(1);
  }
}

main();
