import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { fetchSpec } from '../../src/discovery/fetcher.js';
import { SpecNotFoundError, SpecParseError } from '../../src/shared/errors.js';

let dir: string;

beforeAll(async () => {
  dir = await mkdtemp(join(tmpdir(), 'apix-fetcher-'));
  await writeFile(
    join(dir, 'valid.json'),
    JSON.stringify({
      openapi: '3.0.3',
      info: { title: 'Local', version: '1.0.0' },
      paths: { '/ping': { get: { responses: { '200': { description: 'ok' } } } } },
    }),
    'utf-8'
  );
  await writeFile(join(dir, 'broken.json'), '{ not valid json', 'utf-8');
});

afterAll(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe('fetchSpec', () => {
  it('parses a valid local spec file', async () => {
    const doc = await fetchSpec(join(dir, 'valid.json'));
    expect(doc.info?.title).toBe('Local');
  });

  it('throws SpecNotFoundError for a missing file', async () => {
    await expect(fetchSpec(join(dir, 'does-not-exist.json'))).rejects.toBeInstanceOf(
      SpecNotFoundError
    );
  });

  it('throws SpecParseError for a malformed file', async () => {
    await expect(fetchSpec(join(dir, 'broken.json'))).rejects.toBeInstanceOf(SpecParseError);
  });
});
