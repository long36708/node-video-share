import { readFile } from 'fs/promises';
import JSON5 from 'json5';

const DEFAULT_CONFIG = {
  server: {
    port: 3000,
    https: {
      enabled: false,
      key: './key.pem',
      cert: './cert.pem'
    }
  },
  videos: {
    directory: './videos',
    allowedExtensions: ['.mp4', '.webm', '.ogg', '.mov', '.avi', '.mkv', '.flv', '.wmv']
  },
  security: {
    enableCorsIsolation: true,
    coop: 'same-origin',
    coep: 'require-corp'
  }
};

export async function loadConfig(configPath) {
  try {
    const content = await readFile(configPath, 'utf-8');
    const userConfig = JSON5.parse(content);
    return mergeConfig(DEFAULT_CONFIG, userConfig);
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.warn(`Config file not found at ${configPath}, using defaults`);
      return DEFAULT_CONFIG;
    }
    throw error;
  }
}

function mergeConfig(defaults, userConfig) {
  return {
    server: { ...defaults.server, ...userConfig.server },
    videos: { ...defaults.videos, ...userConfig.videos },
    security: { ...defaults.security, ...userConfig.security }
  };
}
