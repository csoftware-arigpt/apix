#!/usr/bin/env node

import { Command } from 'commander';
import { initCommand } from './commands/init.js';
import { generateCommand } from './commands/generate.js';
import { serveCommand } from './commands/serve.js';
import { mockCommand } from './commands/mock.js';
import { discoverCommand } from './commands/discover.js';

const program = new Command();

program
  .name('apix')
  .description('Turn any OpenAPI spec into an AI-ready MCP server in 30 seconds')
  .version('0.1.0');

program
  .command('init')
  .description('Fetch spec, generate client(s) + MCP server')
  .argument('<spec>', 'OpenAPI spec URL or local file path')
  .option('-o, --output <dir>', 'Output directory')
  .option('-t, --tags <tags>', 'Filter by tags (comma-separated)')
  .option(
    '-l, --languages <langs>',
    'Client languages (comma-separated): typescript, python',
    'typescript'
  )
  .action(initCommand);

program
  .command('generate')
  .description('Regenerate artifacts in an existing apix project')
  .argument('[target]', 'Target: all | client | mcp | python', 'all')
  .option('-d, --dir <dir>', 'Project directory with apix.config.json', '.')
  .option('-o, --output <dir>', 'Override output directory (defaults to --dir)')
  .option('-s, --spec <path>', 'Override spec path (defaults to config value)')
  .option('-t, --tags <tags>', 'Filter by tags (comma-separated)')
  .action(generateCommand);

program
  .command('serve')
  .description('Start MCP server from generated directory (stdio transport)')
  .argument('[dir]', 'Directory with generated files', '.')
  .action(serveCommand);

program
  .command('mock')
  .description('Start mock HTTP server from generated directory')
  .argument('[dir]', 'Directory with generated files', '.')
  .option('-p, --port <port>', 'Port number', '4010')
  .option('-s, --seed <seed>', 'Random seed for deterministic responses')
  .action(mockCommand);

program
  .command('discover')
  .description('Auto-discover OpenAPI spec from a domain')
  .argument('<url>', 'Domain or URL to search')
  .action(discoverCommand);

program.parse();
