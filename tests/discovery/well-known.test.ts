import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { discoverSpec, getWellKnownPaths } from '../../src/discovery/well-known.js';
import { DiscoveryError } from '../../src/shared/errors.js';

const VALID_SPEC = JSON.stringify({
  openapi: '3.0.3',
  info: { title: 'Discovered', version: '1.0.0' },
  paths: {
    '/hello': {
      get: { responses: { '200': { description: 'ok' } } },
    },
  },
});

let server: Server;
let origin: string;
let handler: (url: string) => { status: number; body: string };

beforeEach(async () => {
  handler = () => ({ status: 404, body: 'not found' });
  server = createServer((req, res) => {
    const { status, body } = handler(req.url ?? '/');
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(body);
  });
  await new Promise<void>((resolveFn) => {
    server.listen(0, '127.0.0.1', () => resolveFn());
  });
  const addr = server.address() as AddressInfo;
  origin = `http://127.0.0.1:${addr.port}`;
});

afterEach(async () => {
  await new Promise<void>((resolveFn) => server.close(() => resolveFn()));
});

describe('getWellKnownPaths', () => {
  it('returns a copy of the known path list', () => {
    const paths = getWellKnownPaths();
    expect(paths).toContain('/openapi.json');
    expect(paths).toContain('/swagger.json');
    expect(paths).toContain('/.well-known/openapi.json');
  });
});

describe('discoverSpec', () => {
  it('returns the spec when a well-known path serves it', async () => {
    handler = (url) => {
      if (url === '/openapi.json') return { status: 200, body: VALID_SPEC };
      return { status: 404, body: 'nope' };
    };

    const { doc, foundUrl } = await discoverSpec(origin);
    expect(doc.info?.title).toBe('Discovered');
    expect(foundUrl).toBe(`${origin}/openapi.json`);
  });

  it('throws DiscoveryError when no well-known path serves a spec', async () => {
    handler = () => ({ status: 404, body: 'nope' });
    await expect(discoverSpec(origin)).rejects.toBeInstanceOf(DiscoveryError);
  });
});
