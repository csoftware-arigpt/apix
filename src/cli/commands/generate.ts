import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { logger } from '../utils/logger.js';
import { fetchSpec } from '../../discovery/fetcher.js';
import { resolveSpec } from '../../discovery/resolver.js';
import { generateTypescriptClient } from '../../codegen/typescript/client.js';
import { toSlug } from '../../shared/naming.js';
import { ApixError } from '../../shared/errors.js';

export interface GenerateOptions {
  output?: string;
  tags?: string;
}

export async function generateCommand(spec: string, options: GenerateOptions): Promise<void> {
  const startTime = Date.now();

  try {
    logger.spin(`Fetching OpenAPI spec from ${spec}`);
    const doc = await fetchSpec(spec);

    const summary = resolveSpec(doc);
    logger.success(`Found ${summary.endpointCount} endpoints, ${summary.schemaCount} schemas`);

    const slug = toSlug(summary.info.title || 'api');
    const outDir = resolve(options.output ?? `./${slug}`);
    await mkdir(outDir, { recursive: true });

    const filterTags = options.tags?.split(',').map((t) => t.trim());

    logger.spin('Generating TypeScript client...');
    const clientCode = generateTypescriptClient(doc, summary, filterTags);
    await writeFile(join(outDir, 'client.ts'), clientCode, 'utf-8');
    logger.success(`Generated: ${join(outDir, 'client.ts')} (single file, 0 deps)`);

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
