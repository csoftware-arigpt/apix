import { describe, expect, it } from 'vitest';
import { resolveSpec } from '../../src/discovery/resolver.js';
import type { OpenAPIDocument } from '../../src/shared/openapi.js';

const doc: OpenAPIDocument = {
  openapi: '3.0.3',
  info: { title: 'Test API', version: '2.3.4', description: 'a test' },
  servers: [{ url: 'https://api.example.com/v1' }],
  paths: {
    '/things': {
      get: {
        tags: ['things'],
        responses: { '200': { description: 'ok' } },
      },
      post: {
        tags: ['things', 'write'],
        responses: { '201': { description: 'created' } },
      },
    },
    '/other': {
      get: {
        tags: ['other'],
        responses: { '200': { description: 'ok' } },
      },
    },
  },
  components: {
    schemas: {
      Thing: { type: 'object', properties: { id: { type: 'integer' } } },
      Other: { type: 'object' },
    },
    securitySchemes: {
      ApiKey: { type: 'apiKey', in: 'header', name: 'X-API-Key' },
    },
  },
} as unknown as OpenAPIDocument;

describe('resolveSpec', () => {
  it('extracts info block', () => {
    const summary = resolveSpec(doc);
    expect(summary.info.title).toBe('Test API');
    expect(summary.info.version).toBe('2.3.4');
    expect(summary.info.description).toBe('a test');
    expect(summary.info.baseUrl).toBe('https://api.example.com/v1');
  });

  it('counts endpoints and schemas', () => {
    const summary = resolveSpec(doc);
    expect(summary.endpointCount).toBe(3);
    expect(summary.schemaCount).toBe(2);
  });

  it('collects sorted, deduped tags', () => {
    const summary = resolveSpec(doc);
    expect(summary.tags).toEqual(['other', 'things', 'write']);
  });

  it('exposes security schemes', () => {
    const summary = resolveSpec(doc);
    expect(summary.securitySchemes['ApiKey']).toBeDefined();
  });

  it('falls back to defaults for missing info', () => {
    const summary = resolveSpec({ openapi: '3.0.3', paths: {} } as unknown as OpenAPIDocument);
    expect(summary.info.title).toBe('Untitled API');
    expect(summary.info.version).toBe('0.0.0');
    expect(summary.info.baseUrl).toBeUndefined();
    expect(summary.endpointCount).toBe(0);
    expect(summary.schemaCount).toBe(0);
  });
});
