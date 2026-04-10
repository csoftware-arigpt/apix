import SwaggerParser from '@apidevtools/swagger-parser';
import { SpecNotFoundError, SpecParseError } from '../shared/errors.js';
import type { OpenAPIDocument } from '../shared/openapi.js';

function isUrl(input: string): boolean {
  return input.startsWith('http://') || input.startsWith('https://');
}

export async function fetchSpec(source: string): Promise<OpenAPIDocument> {
  try {
    const doc = await SwaggerParser.validate(source, {
      dereference: { circular: 'ignore' },
    });
    return doc as unknown as OpenAPIDocument;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes('ENOENT') || message.includes('404') || message.includes('not found')) {
      throw new SpecNotFoundError(source);
    }
    throw new SpecParseError(source, message);
  }
}

export async function fetchAndDereference(source: string): Promise<OpenAPIDocument> {
  try {
    const doc = await SwaggerParser.dereference(source, {
      dereference: { circular: 'ignore' },
    });
    return doc as unknown as OpenAPIDocument;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes('ENOENT') || message.includes('404') || message.includes('not found')) {
      throw new SpecNotFoundError(source);
    }
    throw new SpecParseError(source, message);
  }
}
