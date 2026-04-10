import { spawn } from 'node:child_process';
import { access, mkdtemp, readFile, rm } from 'node:fs/promises';
import { constants } from 'node:fs';
import { join, resolve } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

interface CommandResult {
  exitCode: number | null;
  stdout: string;
  stderr: string;
}

const repoRoot = process.cwd();
const cliEntry = resolve(repoRoot, 'dist/cli/index.js');
const fixturePath = resolve(repoRoot, 'tests/fixtures/petstore.yaml');
const tscEntry = resolve(repoRoot, 'node_modules/typescript/bin/tsc');

let tempRoot = '';
let outputDir = '';
let initResult: CommandResult;

describe('apix init CLI', () => {
  beforeAll(async () => {
    await access(cliEntry, constants.F_OK);

    tempRoot = await mkdtemp(join(repoRoot, '.tmp-apix-cli-'));
    outputDir = join(tempRoot, 'petstore');
    initResult = await runCommand(process.execPath, [
      cliEntry,
      'init',
      fixturePath,
      '--output',
      outputDir,
    ]);
  });

  afterAll(async () => {
    if (tempRoot) {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  it('generates the expected project files', async () => {
    expect(initResult.exitCode, initResult.stderr).toBe(0);

    await expectFileExists(resolve(outputDir, 'client.ts'));
    await expectFileExists(resolve(outputDir, 'mcp-server.ts'));
    await expectFileExists(resolve(outputDir, 'apix.config.json'));

    const config = JSON.parse(
      await readFile(resolve(outputDir, 'apix.config.json'), 'utf-8')
    ) as {
      authEnvVar: string;
      authType: string;
      baseUrl: string;
      specPath: string;
    };

    expect(config.baseUrl).toBe('https://petstore.example.com/v1');
    expect(config.authType).toBe('apiKey');
    expect(config.authEnvVar).toBe('APIX_API_KEY');
    expect(config.specPath).toBe(fixturePath);
  });

  it('emits generated TypeScript that compiles', async () => {
    const compileResult = await runCommand(process.execPath, [
      tscEntry,
      '--noEmit',
      '--target',
      'ES2022',
      '--module',
      'NodeNext',
      '--moduleResolution',
      'NodeNext',
      '--strict',
      '--esModuleInterop',
      '--skipLibCheck',
      resolve(outputDir, 'client.ts'),
      resolve(outputDir, 'mcp-server.ts'),
    ]);

    expect(compileResult.exitCode, compileResult.stderr).toBe(0);
  });
});

async function expectFileExists(path: string): Promise<void> {
  await access(path, constants.F_OK);
}

async function runCommand(command: string, args: string[]): Promise<CommandResult> {
  return await new Promise((resolvePromise, reject) => {
    const child = spawn(command, args, {
      cwd: repoRoot,
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.on('error', reject);
    child.on('close', (exitCode) => {
      resolvePromise({ exitCode, stdout, stderr });
    });
  });
}
