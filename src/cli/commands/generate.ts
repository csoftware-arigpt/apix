import { writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { logger } from '../utils/logger.js';
import { readConfig, writeConfig } from '../utils/config.js';
import { fetchSpec } from '../../discovery/fetcher.js';
import { resolveSpec } from '../../discovery/resolver.js';
import { generateTypescriptClient } from '../../codegen/typescript/client.js';
import { generatePythonClient } from '../../codegen/python/client.js';
import { generateMcpServer } from '../../mcp/generator.js';
import { detectAuth } from '../../shared/auth-detector.js';
import { ApixError } from '../../shared/errors.js';

export type GenerateTarget = 'all' | 'client' | 'mcp' | 'python';

const VALID_TARGETS: ReadonlySet<GenerateTarget> = new Set([
  'all',
  'client',
  'mcp',
  'python',
]);

export interface GenerateOptions {
  dir?: string;
  output?: string;
  spec?: string;
  tags?: string;
}

export async function generateCommand(
  target: string | undefined,
  options: GenerateOptions
): Promise<void> {
  const startTime = Date.now();

  const normalizedTarget = (target ?? 'all').toLowerCase() as GenerateTarget;
  if (!VALID_TARGETS.has(normalizedTarget)) {
    logger.error(
      `Unknown target: ${target}`,
      'Valid targets: all, client, mcp, python'
    );
    process.exitCode = 1;
    return;
  }

  const projectDir = resolve(options.dir ?? '.');
  const outDir = resolve(options.output ?? projectDir);

  try {
    let specPath = options.spec;
    if (!specPath) {
      try {
        const config = await readConfig(projectDir);
        specPath = config.specPath;
      } catch (err) {
        if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
          throw new ApixError(
            `No apix.config.json found in ${projectDir}`,
            'Run `apix init <spec>` first, or pass --spec <path>.'
          );
        }
        throw err;
      }
    }

    logger.spin(`Fetching OpenAPI spec from ${specPath}`);
    const doc = await fetchSpec(specPath);

    const summary = resolveSpec(doc);
    logger.success(`Found ${summary.endpointCount} endpoints, ${summary.schemaCount} schemas`);

    const auth = detectAuth(doc);
    const filterTags = options.tags?.split(',').map((t) => t.trim());

    const wantClient = normalizedTarget === 'all' || normalizedTarget === 'client';
    const wantMcp = normalizedTarget === 'all' || normalizedTarget === 'mcp';
    const wantPython = normalizedTarget === 'all' || normalizedTarget === 'python';

    if (wantClient) {
      logger.spin('Generating TypeScript client...');
      const clientCode = generateTypescriptClient(doc, summary, filterTags);
      await writeFile(join(outDir, 'client.ts'), clientCode, 'utf-8');
      logger.success(`Generated: ${join(outDir, 'client.ts')}`);
    }

    if (wantPython) {
      logger.spin('Generating Python client...');
      const pythonCode = generatePythonClient(doc, summary, filterTags);
      await writeFile(join(outDir, 'client.py'), pythonCode, 'utf-8');
      logger.success(`Generated: ${join(outDir, 'client.py')}`);
    }

    if (wantMcp) {
      logger.spin('Generating MCP server...');
      const mcpCode = generateMcpServer(doc, summary, auth, filterTags);
      await writeFile(join(outDir, 'mcp-server.ts'), mcpCode, 'utf-8');
      logger.success(`Generated: ${join(outDir, 'mcp-server.ts')}`);
    }

    // Refresh config timestamp if project dir exists and we have a config
    try {
      const existing = await readConfig(projectDir);
      await writeConfig(projectDir, {
        ...existing,
        specPath,
        generatedAt: new Date().toISOString(),
      });
    } catch {
      // no existing config — skip
    }

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
