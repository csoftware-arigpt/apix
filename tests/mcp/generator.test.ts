import { describe, it, expect } from 'vitest';
import { generateMcpTools, generateMcpServer } from '../../src/mcp/generator.js';
import type { OpenAPIDocument, SpecSummary } from '../../src/shared/openapi.js';
import type { AuthConfig } from '../../src/shared/auth-detector.js';

function makeDoc(paths: Record<string, unknown>): OpenAPIDocument {
  return {
    openapi: '3.0.0',
    info: { title: 'Test API', version: '1.0.0' },
    paths: paths as never,
  } as OpenAPIDocument;
}

const summary: SpecSummary = {
  info: { title: 'Test API', version: '1.0.0', baseUrl: 'https://api.test.com' },
  endpointCount: 0,
  schemaCount: 0,
  securitySchemes: {},
  tags: [],
};

const noneAuth: AuthConfig = { type: 'none', envVar: '', description: 'none' };

describe('generateMcpTools - tool name generation', () => {
  it('uses operationId when provided (snake_case)', () => {
    const doc = makeDoc({
      '/users': {
        get: { operationId: 'listUsers', responses: { '200': { description: 'ok' } } },
      },
    });
    const tools = generateMcpTools(doc);
    expect(tools).toHaveLength(1);
    expect(tools[0]!.name).toBe('list_users');
  });

  it('derives name from method+path when operationId missing', () => {
    const doc = makeDoc({
      '/pets/{petId}': {
        get: { responses: { '200': { description: 'ok' } } },
      },
    });
    const tools = generateMcpTools(doc);
    expect(tools[0]!.name).toBe('get_pets');
  });

  it('sets method and path on tool', () => {
    const doc = makeDoc({
      '/items': {
        post: { operationId: 'createItem', responses: { '201': { description: 'ok' } } },
      },
    });
    const tools = generateMcpTools(doc);
    expect(tools[0]!.method).toBe('POST');
    expect(tools[0]!.path).toBe('/items');
  });

  it('uses summary as description, falling back to description, then method+path', () => {
    const doc = makeDoc({
      '/a': { get: { summary: 'Get A', responses: { '200': { description: 'ok' } } } },
      '/b': { get: { description: 'Get B desc', responses: { '200': { description: 'ok' } } } },
      '/c': { get: { responses: { '200': { description: 'ok' } } } },
    });
    const tools = generateMcpTools(doc);
    expect(tools[0]!.description).toBe('Get A');
    expect(tools[1]!.description).toBe('Get B desc');
    expect(tools[2]!.description).toBe('GET /c');
  });
});

describe('generateMcpTools - inputSchema', () => {
  it('builds inputSchema from path and query parameters', () => {
    const doc = makeDoc({
      '/users/{id}': {
        get: {
          operationId: 'getUser',
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
            { name: 'verbose', in: 'query', required: false, schema: { type: 'boolean' }, description: 'be verbose' },
          ],
          responses: { '200': { description: 'ok' } },
        },
      },
    });
    const tools = generateMcpTools(doc);
    const schema = tools[0]!.inputSchema;
    expect(schema['type']).toBe('object');
    const props = schema['properties'] as Record<string, Record<string, unknown>>;
    expect(props['id']).toBeDefined();
    expect(props['id']!['type']).toBe('string');
    expect(props['verbose']!['description']).toBe('be verbose');
    expect(schema['required']).toEqual(['id']);
  });

  it('expands object requestBody properties into inputSchema', () => {
    const doc = makeDoc({
      '/pets': {
        post: {
          operationId: 'createPet',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    age: { type: 'integer' },
                  },
                  required: ['name'],
                },
              },
            },
          },
          responses: { '201': { description: 'ok' } },
        },
      },
    });
    const tools = generateMcpTools(doc);
    const schema = tools[0]!.inputSchema;
    const props = schema['properties'] as Record<string, unknown>;
    expect(props['name']).toBeDefined();
    expect(props['age']).toBeDefined();
    expect(schema['required']).toEqual(['name']);
  });

  it('wraps non-object requestBody under "body" key', () => {
    const doc = makeDoc({
      '/raw': {
        post: {
          operationId: 'postRaw',
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { type: 'string' } } },
          },
          responses: { '200': { description: 'ok' } },
        },
      },
    });
    const tools = generateMcpTools(doc);
    const schema = tools[0]!.inputSchema;
    const props = schema['properties'] as Record<string, unknown>;
    expect(props['body']).toBeDefined();
    expect(schema['required']).toEqual(['body']);
  });

  it('omits required when empty', () => {
    const doc = makeDoc({
      '/ping': {
        get: { operationId: 'ping', responses: { '200': { description: 'ok' } } },
      },
    });
    const tools = generateMcpTools(doc);
    expect(tools[0]!.inputSchema['required']).toBeUndefined();
  });
});

describe('generateMcpTools - tag filter', () => {
  const doc = makeDoc({
    '/a': { get: { operationId: 'opA', tags: ['admin'], responses: { '200': { description: 'ok' } } } },
    '/b': { get: { operationId: 'opB', tags: ['public'], responses: { '200': { description: 'ok' } } } },
    '/c': { get: { operationId: 'opC', tags: ['public', 'admin'], responses: { '200': { description: 'ok' } } } },
  });

  it('returns all tools when filter empty/undefined', () => {
    expect(generateMcpTools(doc)).toHaveLength(3);
    expect(generateMcpTools(doc, [])).toHaveLength(3);
  });

  it('filters by a single tag', () => {
    const tools = generateMcpTools(doc, ['public']);
    expect(tools.map((t) => t.name).sort()).toEqual(['op_b', 'op_c']);
  });

  it('includes operation matching any of multiple tags', () => {
    const tools = generateMcpTools(doc, ['admin']);
    expect(tools.map((t) => t.name).sort()).toEqual(['op_a', 'op_c']);
  });

  it('excludes ops missing all filter tags', () => {
    const tools = generateMcpTools(doc, ['nonexistent']);
    expect(tools).toHaveLength(0);
  });
});

describe('generateMcpServer - auth headers', () => {
  const doc = makeDoc({
    '/x': { get: { operationId: 'getX', responses: { '200': { description: 'ok' } } } },
  });

  it('uses custom header name for apiKey auth', () => {
    const auth: AuthConfig = {
      type: 'apiKey',
      headerName: 'X-Api-Key',
      envVar: 'MY_KEY',
      description: 'key',
    };
    const code = generateMcpServer(doc, summary, auth);
    expect(code).toContain("process.env['MY_KEY']");
    expect(code).toContain("headers['X-Api-Key'] = API_KEY");
  });

  it('uses Bearer prefix for bearer auth', () => {
    const auth: AuthConfig = { type: 'bearer', envVar: 'APIX_API_KEY', description: 'b' };
    const code = generateMcpServer(doc, summary, auth);
    expect(code).toContain('Bearer ${API_KEY}');
  });

  it('uses Basic prefix for basic auth', () => {
    const auth: AuthConfig = { type: 'basic', envVar: 'APIX_API_KEY', description: 'b' };
    const code = generateMcpServer(doc, summary, auth);
    expect(code).toContain('Basic ${API_KEY}');
  });

  it('defaults env var to APIX_API_KEY when none provided', () => {
    const auth: AuthConfig = { type: 'none', envVar: '', description: 'none' };
    const code = generateMcpServer(doc, summary, auth);
    expect(code).toContain("process.env['APIX_API_KEY']");
  });
});

describe('generateMcpServer - zod conversion', () => {
  it('maps primitive types to zod equivalents', () => {
    const doc = makeDoc({
      '/p': {
        post: {
          operationId: 'p',
          parameters: [
            { name: 's', in: 'query', required: true, schema: { type: 'string' } },
            { name: 'n', in: 'query', required: true, schema: { type: 'number' } },
            { name: 'i', in: 'query', required: true, schema: { type: 'integer' } },
            { name: 'b', in: 'query', required: true, schema: { type: 'boolean' } },
            { name: 'a', in: 'query', required: false, schema: { type: 'array' } },
            { name: 'o', in: 'query', required: false, schema: { type: 'object' } },
          ],
          responses: { '200': { description: 'ok' } },
        },
      },
    });
    const code = generateMcpServer(doc, summary, noneAuth);
    expect(code).toContain('s: z.string()');
    expect(code).toContain('n: z.number()');
    expect(code).toContain('i: z.number()');
    expect(code).toContain('b: z.boolean()');
    expect(code).toContain('z.array(z.unknown()).optional()');
    expect(code).toContain('z.object({}).passthrough().optional()');
  });

  it('marks optional params with .optional()', () => {
    const doc = makeDoc({
      '/p': {
        get: {
          operationId: 'p',
          parameters: [
            { name: 'opt', in: 'query', required: false, schema: { type: 'string' } },
          ],
          responses: { '200': { description: 'ok' } },
        },
      },
    });
    const code = generateMcpServer(doc, summary, noneAuth);
    expect(code).toContain('opt: z.string().optional()');
  });

  it('adds .describe() when description present', () => {
    const doc = makeDoc({
      '/p': {
        get: {
          operationId: 'p',
          parameters: [
            { name: 'x', in: 'query', required: true, schema: { type: 'string' }, description: 'the x' },
          ],
          responses: { '200': { description: 'ok' } },
        },
      },
    });
    const code = generateMcpServer(doc, summary, noneAuth);
    expect(code).toContain('z.string().describe("the x")');
  });
});

describe('generateMcpServer - request building / path substitution', () => {
  const doc = makeDoc({
    '/users/{id}': {
      get: {
        operationId: 'getUser',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: { '200': { description: 'ok' } },
      },
    },
  });

  it('emits path-param substitution logic', () => {
    const code = generateMcpServer(doc, summary, noneAuth);
    expect(code).toContain('path.match(/\\{([^}]+)\\}/g)');
    expect(code).toContain('url.replace(pp,');
  });

  it('emits path string for tool registration', () => {
    const code = generateMcpServer(doc, summary, noneAuth);
    expect(code).toContain("apiRequest('GET', '/users/{id}', params");
  });

  it('includes BASE_URL and header Content-Type', () => {
    const code = generateMcpServer(doc, summary, noneAuth);
    expect(code).toContain("const BASE_URL = process.env['APIX_BASE_URL'] ?? 'https://api.test.com'");
    expect(code).toContain("'Content-Type': 'application/json'");
  });

  it('respects tag filter in generated server', () => {
    const multiDoc = makeDoc({
      '/a': { get: { operationId: 'opA', tags: ['keep'], responses: { '200': { description: 'ok' } } } },
      '/b': { get: { operationId: 'opB', tags: ['drop'], responses: { '200': { description: 'ok' } } } },
    });
    const code = generateMcpServer(multiDoc, summary, noneAuth, ['keep']);
    expect(code).toContain("'op_a'");
    expect(code).not.toContain("'op_b'");
    expect(code).toContain('// 1 tools available');
  });
});
