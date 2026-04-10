import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { ApixConfig } from '../cli/utils/config.js';

export async function startMcpServer(dir: string, config: ApixConfig): Promise<void> {
  const mcpServerPath = join(dir, 'mcp-server.ts');

  // Dynamic import of tsx to run the generated MCP server
  const { execFileSync } = await import('node:child_process');
  execFileSync('npx', ['tsx', mcpServerPath], {
    stdio: 'inherit',
    env: {
      ...process.env,
      APIX_BASE_URL: process.env['APIX_BASE_URL'] ?? config.baseUrl,
    },
  });
}
