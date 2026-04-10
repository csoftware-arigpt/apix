import { spawn } from 'node:child_process';
import { access, mkdtemp, rm } from 'node:fs/promises';
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

let tempRoot = '';
let projectDir = '';

describe('apix generate CLI', () => {
  beforeAll(async () => {
    await access(cliEntry, constants.F_OK);
    tempRoot = await mkdtemp(join(repoRoot, '.tmp-apix-gen-'));
    projectDir = join(tempRoot, 'project');

    const init = await runCommand(process.execPath, [
      cliEntry,
      'init',
      fixturePath,
      '--output',
      projectDir,
      '--languages',
      'typescript',
    ]);
    expect(init.exitCode, init.stderr).toBe(0);

    // Remove client.ts and mcp-server.ts so we can regenerate them
    await rm(join(projectDir, 'client.ts'));
    await rm(join(projectDir, 'mcp-server.ts'));
  });

  afterAll(async () => {
    if (tempRoot) {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  it('regenerates only the client when target=client', async () => {
    const result = await runCommand(process.execPath, [
      cliEntry,
      'generate',
      'client',
      '--dir',
      projectDir,
    ]);
    expect(result.exitCode, result.stderr).toBe(0);
    await expectFileExists(join(projectDir, 'client.ts'));
    await expectFileMissing(join(projectDir, 'mcp-server.ts'));
  });

  it('regenerates the MCP server when target=mcp', async () => {
    const result = await runCommand(process.execPath, [
      cliEntry,
      'generate',
      'mcp',
      '--dir',
      projectDir,
    ]);
    expect(result.exitCode, result.stderr).toBe(0);
    await expectFileExists(join(projectDir, 'mcp-server.ts'));
  });

  it('generates the Python client when target=python', async () => {
    const result = await runCommand(process.execPath, [
      cliEntry,
      'generate',
      'python',
      '--dir',
      projectDir,
    ]);
    expect(result.exitCode, result.stderr).toBe(0);
    await expectFileExists(join(projectDir, 'client.py'));
  });

  it('rejects an unknown target with a clear error', async () => {
    const result = await runCommand(process.execPath, [
      cliEntry,
      'generate',
      'bogus',
      '--dir',
      projectDir,
    ]);
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toMatch(/Unknown target/);
  });

  it('errors with guidance when no config is present', async () => {
    const bareDir = join(tempRoot, 'bare');
    const result = await runCommand(process.execPath, [
      cliEntry,
      'generate',
      '--dir',
      bareDir,
    ]);
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toMatch(/apix\.config\.json/);
  });
});

async function expectFileExists(path: string): Promise<void> {
  await access(path, constants.F_OK);
}

async function expectFileMissing(path: string): Promise<void> {
  let exists = false;
  try {
    await access(path, constants.F_OK);
    exists = true;
  } catch {
    // expected
  }
  expect(exists, `Expected ${path} to be missing`).toBe(false);
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
