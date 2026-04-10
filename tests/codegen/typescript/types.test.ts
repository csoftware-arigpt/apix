import { describe, it, expect } from 'vitest';
import { generateTypeString, generateTypes } from '../../../src/codegen/typescript/types.js';
import type { OpenAPIDocument } from '../../../src/shared/openapi.js';

describe('generateTypeString — primitives', () => {
  it('maps string/number/integer/boolean', () => {
    expect(generateTypeString({ type: 'string' })).toBe('string');
    expect(generateTypeString({ type: 'number' })).toBe('number');
    expect(generateTypeString({ type: 'integer' })).toBe('number');
    expect(generateTypeString({ type: 'boolean' })).toBe('boolean');
  });

  it('falls back to unknown for missing type', () => {
    expect(generateTypeString({})).toBe('unknown');
  });
});

describe('generateTypeString — enums', () => {
  it('renders string enums as union of quoted literals', () => {
    expect(generateTypeString({ type: 'string', enum: ['red', 'green'] })).toBe(
      "'red' | 'green'"
    );
  });

  it('renders numeric enums without quotes', () => {
    expect(generateTypeString({ type: 'integer', enum: [1, 2, 3] })).toBe('1 | 2 | 3');
  });
});

describe('generateTypeString — arrays', () => {
  it('renders Array<string>', () => {
    expect(generateTypeString({ type: 'array', items: { type: 'string' } })).toBe(
      'Array<string>'
    );
  });

  it('defaults to Array<unknown> when items missing', () => {
    expect(generateTypeString({ type: 'array' })).toBe('Array<unknown>');
  });

  it('supports nested arrays', () => {
    expect(
      generateTypeString({
        type: 'array',
        items: { type: 'array', items: { type: 'number' } },
      })
    ).toBe('Array<Array<number>>');
  });
});

describe('generateTypeString — objects', () => {
  it('renders inline object with required/optional fields', () => {
    const out = generateTypeString({
      type: 'object',
      properties: {
        id: { type: 'integer' },
        name: { type: 'string' },
      },
      required: ['id'],
    });
    expect(out).toContain('id: number;');
    expect(out).toContain('name?: string;');
  });

  it('handles nullable properties', () => {
    const out = generateTypeString({
      type: 'object',
      properties: { bio: { type: 'string', nullable: true } },
      required: ['bio'],
    });
    expect(out).toContain('bio: string | null;');
  });

  it('emits Record<string, unknown> for empty object', () => {
    expect(generateTypeString({ type: 'object' })).toBe('Record<string, unknown>');
  });

  it('handles additionalProperties', () => {
    expect(
      generateTypeString({
        type: 'object',
        additionalProperties: { type: 'number' },
      })
    ).toBe('Record<string, number>');
  });

  it('quotes non-identifier property names', () => {
    const out = generateTypeString({
      type: 'object',
      properties: { 'x-custom': { type: 'string' } },
    });
    expect(out).toContain("'x-custom'?: string;");
  });

  it('emits description comments', () => {
    const out = generateTypeString({
      type: 'object',
      properties: { id: { type: 'integer', description: 'primary key' } },
      required: ['id'],
    });
    expect(out).toContain('/** primary key */');
  });
});

describe('generateTypeString — composition', () => {
  it('handles oneOf as union', () => {
    const out = generateTypeString({
      oneOf: [{ type: 'string' }, { type: 'number' }],
    });
    expect(out).toBe('string | number');
  });

  it('handles anyOf as union', () => {
    const out = generateTypeString({
      anyOf: [{ type: 'string' }, { type: 'boolean' }],
    });
    expect(out).toBe('string | boolean');
  });

  it('handles allOf as intersection', () => {
    const out = generateTypeString({
      allOf: [
        { type: 'object', properties: { a: { type: 'string' } }, required: ['a'] },
        { type: 'object', properties: { b: { type: 'number' } }, required: ['b'] },
      ],
    });
    expect(out).toContain('&');
    expect(out).toContain('a: string');
    expect(out).toContain('b: number');
  });
});

describe('generateTypes — full document', () => {
  const doc: OpenAPIDocument = {
    openapi: '3.0.0',
    info: { title: 'Test', version: '1.0.0' },
    paths: {},
    components: {
      schemas: {
        Pet: {
          type: 'object',
          description: 'A pet',
          properties: {
            id: { type: 'integer' },
            name: { type: 'string' },
            status: { type: 'string', enum: ['available', 'pending'] },
          },
          required: ['id', 'name'],
        },
        Status: { type: 'string', enum: ['on', 'off'] },
      },
    },
  } as unknown as OpenAPIDocument;

  it('generates interface for object schemas', () => {
    const out = generateTypes(doc);
    expect(out).toContain('export interface Pet');
    expect(out).toContain('id: number;');
    expect(out).toContain('name: string;');
    expect(out).toContain("status?: 'available' | 'pending';");
  });

  it('generates type alias for enum schemas', () => {
    const out = generateTypes(doc);
    expect(out).toContain("export type Status = 'on' | 'off';");
  });

  it('emits schema description as jsdoc', () => {
    const out = generateTypes(doc);
    expect(out).toContain('/** A pet */');
  });

  it('returns empty string when no schemas', () => {
    const emptyDoc = {
      openapi: '3.0.0',
      info: { title: 't', version: '1' },
      paths: {},
    } as unknown as OpenAPIDocument;
    expect(generateTypes(emptyDoc)).toBe('');
  });
});
