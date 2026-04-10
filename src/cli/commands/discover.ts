import { logger } from '../utils/logger.js';
import { discoverSpec } from '../../discovery/well-known.js';
import { resolveSpec } from '../../discovery/resolver.js';
import { ApixError } from '../../shared/errors.js';

export async function discoverCommand(url: string): Promise<void> {
  const startTime = Date.now();

  try {
    logger.spin(`Searching for OpenAPI spec on ${url}`);
    const { doc, foundUrl } = await discoverSpec(url);

    const summary = resolveSpec(doc);
    logger.success(`Found spec at: ${foundUrl}`);
    logger.newline();
    logger.table([
      ['Title', summary.info.title],
      ['Version', summary.info.version],
      ['Endpoints', String(summary.endpointCount)],
      ['Schemas', String(summary.schemaCount)],
    ]);

    if (summary.info.description) {
      logger.newline();
      logger.info(summary.info.description);
    }

    logger.newline();
    logger.info(`Run: npx apix init ${foundUrl}`);
    logger.done(startTime);
  } catch (err) {
    if (err instanceof ApixError) {
      logger.error(err.message, err.suggestion);
    } else {
      logger.error(String(err));
    }
    process.exitCode = 1;
  }
}
