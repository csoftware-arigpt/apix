import { mkdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { logger } from '../utils/logger.js';
import { writeConfig, type ApixConfig } from '../utils/config.js';
import { fetchSpec } from '../../discovery/fetcher.js';
import { resolveSpec } from '../../discovery/resolver.js';
import { generateTypescriptClient } from '../../codegen/typescript/client.js';
import { generateMcpServer } from '../../mcp/generator.js';
import { detectAuth } from '../../shared/auth-detector.js';
import { toSlug } from '../../shared/naming.js';
import { ApixError } from '../../shared/errors.js';

export interface InitOptions {
  output?: string;
  tags?: string;
}

export async function initCommand(spec: string, options: InitOptions): Promise<void> {
  const startTime = Date.now();

  try {
    logger.spin(`Fetching OpenAPI spec from ${spec}`);
    const doc = await fetchSpec(spec);

    const summary = resolveSpec(doc);
    logger.success(`Found ${summary.endpointCount} endpoints, ${summary.schemaCount} schemas`);

    const slug = toSlug(summary.info.title || 'api');
    const outDir = resolve(options.output ?? `./${slug}`);
    await mkdir(outDir, { recursive: true });

    const auth = detectAuth(doc);

    const filterTags = options.tags?.split(',').map((t) => t.trim());

    logger.spin('Generating TypeScript client...');
    const clientCode = generateTypescriptClient(doc, summary, filterTags);
    const { writeFile } = await import('node:fs/promises');
    await writeFile(join(outDir, 'client.ts'), clientCode, 'utf-8');
    logger.success(`Generated: ${join(outDir, 'client.ts')} (single file, 0 deps)`);

    logger.spin('Generating MCP server...');
    const mcpCode = generateMcpServer(doc, summary, auth, filterTags);
    await writeFile(join(outDir, 'mcp-server.ts'), mcpCode, 'utf-8');
    logger.success(`Generated: ${join(outDir, 'mcp-server.ts')}`);

    const config: ApixConfig = {
      baseUrl: summary.info.baseUrl ?? '',
      authType: auth.type,
      authEnvVar: auth.envVar,
      specPath: spec,
      generatedAt: new Date().toISOString(),
    };
    await writeConfig(outDir, config);

    logger.newline();
    logger.success(`Output directory: ${outDir}`);
    logger.newline();
    logger.table([
      ['Client', 'client.ts'],
      ['MCP Server', 'mcp-server.ts'],
      ['Config', 'apix.config.json'],
    ]);
    logger.newline();

    if (auth.type !== 'none') {
      logger.info(`Auth: ${auth.description}`);
      logger.info(`Set ${auth.envVar} before running the MCP server`);
      logger.newline();
    }

    logger.info(`Run: npx apix serve ${outDir}`);
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
