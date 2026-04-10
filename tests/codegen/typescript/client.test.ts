import { describe, it, expect } from 'vitest';
import { generateTypescriptClient } from '../../../src/codegen/typescript/client.js';
import type { OpenAPIDocument, SpecSummary } from '../../../src/shared/openapi.js';

const summary: SpecSummary = {
  info: { title: 'Test API', version: '1.0.0', baseUrl: 'https://api.test.com' },
  endpointCount: 0,
  schemaCount: 0,
  securitySchemes: {},
  tags: [],
};

function makeDoc(paths: Record<string, unknown>, schemas: Record<string, unknown> = {}): OpenAPIDocument {
  return {
    openapi: '3.0.0',
    info: { title: 'Test API', version: '1.0.0' },
    paths,
    components: { schemas },
  } as unknown as OpenAPIDocument;
}

describe('generateTypescriptClient — structure', () => {
  it('emits header, ApiError, ApiClient, and options interface', () => {
    const doc = makeDoc({});
    const out = generateTypescriptClient(doc, summary);
    expect(out).toContain('export class ApiError extends Error');
    expect(out).toContain('export interface ApiClientOptions');
    expect(out).toContain('export class ApiClient');
    expect(out).toContain('https://api.test.com');
  });

  it('embeds generated types block when schemas present', () => {
    const doc = makeDoc(
      {},
      {
        Pet: { type: 'object', properties: { id: { type: 'integer' } }, required: ['id'] },
      }
    );
    const out = generateTypescriptClient(doc, summary);
    expect(out).toContain('export interface Pet');
  });
});

describe('generateTypescriptClient — auth headers', () => {
  it('uses bearer token over apiKey', () => {
    const out = generateTypescriptClient(makeDoc({}), summary);
    expect(out).toContain('Bearer ${options.bearerToken}');
    expect(out).toContain('options.apiKey');
  });
});

describe('generateTypescriptClient — retry logic', () => {
  it('includes exponential backoff loop for 429/5xx', () => {
    const out = generateTypescriptClient(makeDoc({}), summary);
    expect(out).toMatch(/for \(let attempt = 0; attempt < 3; attempt\+\+\)/);
    expect(out).toContain('Math.pow(2, attempt)');
    expect(out).toContain('res.status === 429 || res.status >= 500');
    expect(out).toContain('res.status === 204');
  });
});

describe('generateTypescriptClient — method generation', () => {
  const doc = makeDoc({
    '/pets': {
      get: {
        operationId: 'listPets',
        parameters: [
          { name: 'limit', in: 'query', required: false, schema: { type: 'integer' } },
        ],
        responses: {
          '200': {
            description: 'ok',
            content: {
              'application/json': { schema: { type: 'array', items: { type: 'object' } } },
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
              schema: { type: 'object', properties: { name: { type: 'string' } } },
            },
          },
        },
        responses: {
          '201': {
            description: 'created',
            content: { 'application/json': { schema: { type: 'object' } } },
          },
        },
      },
    },
    '/pets/{petId}': {
      get: {
        operationId: 'getPetById',
        parameters: [{ name: 'petId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': {
            description: 'ok',
            content: { 'application/json': { schema: { type: 'object' } } },
          },
        },
      },
      delete: {
        operationId: 'deletePet',
        parameters: [{ name: 'petId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '204': { description: 'no content' } },
      },
    },
  });

  it('generates a method per operation using operationId', () => {
    const out = generateTypescriptClient(doc, summary);
    expect(out).toMatch(/async listPets\(/);
    expect(out).toMatch(/async createPet\(/);
    expect(out).toMatch(/async getPetById\(/);
    expect(out).toMatch(/async deletePet\(/);
  });

  it('builds query param mapping', () => {
    const out = generateTypescriptClient(doc, summary);
    expect(out).toContain('limit?: number');
    expect(out).toMatch(/query: \{[^}]*limit:/);
  });

  it('substitutes path params in template literal', () => {
    const out = generateTypescriptClient(doc, summary);
    expect(out).toContain('`/pets/${params.petId}`');
  });

  it('passes body for request-body operations', () => {
    const out = generateTypescriptClient(doc, summary);
    expect(out).toMatch(/body: params\.body/);
  });

  it('uses correct HTTP method verbs', () => {
    const out = generateTypescriptClient(doc, summary);
    expect(out).toContain("'GET'");
    expect(out).toContain("'POST'");
    expect(out).toContain("'DELETE'");
  });

  it('uses plain string literal path when no path params', () => {
    const out = generateTypescriptClient(doc, summary);
    expect(out).toContain("'/pets'");
  });
});

describe('generateTypescriptClient — tag filter', () => {
  const doc = makeDoc({
    '/a': {
      get: {
        operationId: 'opA',
        tags: ['foo'],
        responses: { '200': { description: 'ok' } },
      },
    },
    '/b': {
      get: {
        operationId: 'opB',
        tags: ['bar'],
        responses: { '200': { description: 'ok' } },
      },
    },
  });

  it('includes only operations with matching tag', () => {
    const out = generateTypescriptClient(doc, summary, ['foo']);
    expect(out).toMatch(/async opA\(/);
    expect(out).not.toMatch(/async opB\(/);
  });

  it('includes all operations when no filter given', () => {
    const out = generateTypescriptClient(doc, summary);
    expect(out).toMatch(/async opA\(/);
    expect(out).toMatch(/async opB\(/);
  });
});

describe('generateTypescriptClient — return types', () => {
  it('picks 2xx response schema for return type', () => {
    const doc = makeDoc({
      '/thing': {
        get: {
          operationId: 'getThing',
          responses: {
            '200': {
              description: 'ok',
              content: { 'application/json': { schema: { type: 'string' } } },
            },
          },
        },
      },
    });
    const out = generateTypescriptClient(doc, summary);
    expect(out).toMatch(/getThing\([^)]*\): Promise<string>/);
  });

  it('falls back to unknown when no schema', () => {
    const doc = makeDoc({
      '/thing': {
        get: {
          operationId: 'getThing',
          responses: { '200': { description: 'ok' } },
        },
      },
    });
    const out = generateTypescriptClient(doc, summary);
    expect(out).toMatch(/getThing\([^)]*\): Promise<unknown>/);
  });
});
