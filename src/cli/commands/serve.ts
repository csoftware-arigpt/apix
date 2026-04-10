import { resolve } from 'node:path';
import { logger } from '../utils/logger.js';
import { readConfig } from '../utils/config.js';
import { ApixError } from '../../shared/errors.js';
import { startMcpServer } from '../../mcp/server.js';

export async function serveCommand(dir?: string): Promise<void> {
  const targetDir = resolve(dir ?? '.');

  try {
    const config = await readConfig(targetDir);
    logger.info(`Starting MCP server from ${targetDir}`);
    logger.info(`Base URL: ${config.baseUrl}`);

    if (config.authType !== 'none' && !process.env[config.authEnvVar]) {
      logger.warn(`${config.authEnvVar} is not set. API calls may fail.`);
    }

    await startMcpServer(targetDir, config);
  } catch (err) {
    if (err instanceof ApixError) {
      logger.error(err.message, err.suggestion);
    } else if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      logger.error(
        `No apix.config.json found in ${targetDir}`,
        'Run `apix init <spec>` first to generate the MCP server.'
      );
    } else {
      logger.error(String(err));
    }
    process.exitCode = 1;
  }
}
