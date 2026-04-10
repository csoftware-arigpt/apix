import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { createMockApp } from '../../src/mock/app.js';
import type { OpenAPIDocument } from '../../src/shared/openapi.js';

const spec: OpenAPIDocument = {
  openapi: '3.0.3',
  info: { title: 'Petstore', version: '1.0.0' },
  servers: [{ url: 'https://example.com/v1' }],
  paths: {
    '/pets': {
      get: {
        operationId: 'listPets',
        responses: {
          '200': {
            description: 'ok',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: {
                    type: 'object',
                    required: ['id', 'name'],
                    properties: {
                      id: { type: 'integer' },
                      name: { type: 'string' },
                    },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        operationId: 'createPet',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name'],
                properties: { name: { type: 'string' } },
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'created',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['id', 'name'],
                  properties: {
                    id: { type: 'integer' },
                    name: { type: 'string' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/pets/{petId}': {
      get: {
        operationId: 'getPet',
        parameters: [
          {
            name: 'petId',
            in: 'path',
            required: true,
            schema: { type: 'integer' },
          },
        ],
        responses: {
          '200': {
            description: 'ok',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['id'],
                  properties: { id: { type: 'integer' } },
                },
              },
            },
          },
        },
      },
      delete: {
        operationId: 'deletePet',
        parameters: [
          {
            name: 'petId',
            in: 'path',
            required: true,
            schema: { type: 'integer' },
          },
        ],
        responses: {
          '204': { description: 'deleted' },
        },
      },
    },
  },
} as unknown as OpenAPIDocument;

let server: Server;
let baseUrl: string;

async function listen(app: ReturnType<typeof createMockApp>): Promise<{ server: Server; baseUrl: string }> {
  return await new Promise((resolveFn) => {
    const srv = app.listen(0, () => {
      const addr = srv.address() as AddressInfo;
      resolveFn({ server: srv, baseUrl: `http://127.0.0.1:${addr.port}` });
    });
  });
}

async function close(srv: Server): Promise<void> {
  await new Promise<void>((resolveFn) => srv.close(() => resolveFn()));
}

describe('createMockApp', () => {
  beforeEach(async () => {
    const app = createMockApp(spec, { seed: 42 });
    ({ server, baseUrl } = await listen(app));
  });

  afterEach(async () => {
    await close(server);
  });

  it('registers routes for all operations', async () => {
    const res = await fetch(`${baseUrl}/pets`);
    expect(res.status).toBe(200);
    const data = (await res.json()) as Array<Record<string, unknown>>;
    expect(Array.isArray(data)).toBe(true);
    if (data.length > 0) {
      expect(data[0]).toHaveProperty('id');
      expect(data[0]).toHaveProperty('name');
    }
  });

  it('substitutes path parameters', async () => {
    const res = await fetch(`${baseUrl}/pets/123`);
    expect(res.status).toBe(200);
    const data = (await res.json()) as Record<string, unknown>;
    expect(data).toHaveProperty('id');
  });

  it('returns 201 for POST create with request body', async () => {
    const res = await fetch(`${baseUrl}/pets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'rex' }),
    });
    expect(res.status).toBe(201);
    const data = (await res.json()) as Record<string, unknown>;
    expect(data).toHaveProperty('id');
    expect(data).toHaveProperty('name');
  });

  it('returns 204 with empty body for delete', async () => {
    const res = await fetch(`${baseUrl}/pets/1`, { method: 'DELETE' });
    expect(res.status).toBe(204);
    const text = await res.text();
    expect(text).toBe('');
  });

  it('sets CORS headers', async () => {
    const res = await fetch(`${baseUrl}/pets`);
    expect(res.headers.get('access-control-allow-origin')).toBe('*');
    expect(res.headers.get('access-control-allow-methods')).toContain('GET');
  });

  it('handles OPTIONS preflight with 204', async () => {
    const res = await fetch(`${baseUrl}/pets`, { method: 'OPTIONS' });
    expect(res.status).toBe(204);
  });

  it('returns 404 for unknown routes', async () => {
    const res = await fetch(`${baseUrl}/unknown`);
    expect(res.status).toBe(404);
  });
});
