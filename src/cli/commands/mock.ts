import { resolve } from 'node:path';
import { logger } from '../utils/logger.js';
import { readConfig } from '../utils/config.js';
import { fetchSpec } from '../../discovery/fetcher.js';
import { startMockServer } from '../../mock/server.js';
import { ApixError } from '../../shared/errors.js';

export interface MockOptions {
  port?: string;
  seed?: string;
}

export async function mockCommand(dir: string | undefined, options: MockOptions): Promise<void> {
  const targetDir = resolve(dir ?? '.');

  try {
    const config = await readConfig(targetDir);
    const port = options.port ? parseInt(options.port, 10) : 4010;
    const seed = options.seed ? parseInt(options.seed, 10) : undefined;

    logger.spin(`Loading OpenAPI spec from ${config.specPath}`);
    const doc = await fetchSpec(config.specPath);
    logger.success('Spec loaded');

    await startMockServer(doc, { port, seed });
  } catch (err) {
    if (err instanceof ApixError) {
      logger.error(err.message, err.suggestion);
    } else if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      logger.error(
        `No apix.config.json found in ${targetDir}`,
        'Run `apix init <spec>` first.'
      );
    } else {
      logger.error(String(err));
    }
    process.exitCode = 1;
  }
}
