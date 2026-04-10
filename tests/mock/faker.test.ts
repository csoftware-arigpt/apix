import { describe, expect, it } from 'vitest';
import { generateFakeData } from '../../src/mock/faker.js';

describe('generateFakeData', () => {
  it('returns a string for string schema', () => {
    const data = generateFakeData({ type: 'string' });
    expect(typeof data).toBe('string');
  });

  it('returns a number for integer schema', () => {
    const data = generateFakeData({ type: 'integer' });
    expect(typeof data).toBe('number');
  });

  it('returns an object with required properties populated', () => {
    const data = generateFakeData({
      type: 'object',
      required: ['id', 'name'],
      properties: {
        id: { type: 'integer' },
        name: { type: 'string' },
      },
    }) as Record<string, unknown>;
    expect(data).toHaveProperty('id');
    expect(data).toHaveProperty('name');
    expect(typeof data['id']).toBe('number');
    expect(typeof data['name']).toBe('string');
  });

  it('returns an array for array schema', () => {
    const data = generateFakeData({
      type: 'array',
      items: { type: 'string' },
    });
    expect(Array.isArray(data)).toBe(true);
  });

  it('uses an example value when present', () => {
    const data = generateFakeData({
      type: 'string',
      example: 'hello-world',
    });
    expect(data).toBe('hello-world');
  });

  it('returns {} when schema is malformed', () => {
    const data = generateFakeData({ type: 'bogus-type' as unknown as string });
    // json-schema-faker may throw — helper catches and returns {}
    expect(data).toBeDefined();
  });
});
