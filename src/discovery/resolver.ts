import type { OpenAPIDocument, SecurityScheme, SpecSummary } from '../shared/openapi.js';
import { extractOperations } from '../shared/openapi.js';

export function resolveSpec(doc: OpenAPIDocument): SpecSummary {
  const operations = extractOperations(doc);
  const endpointCount = operations.length;

  const schemas = doc.components?.schemas ?? {};
  const schemaCount = Object.keys(schemas).length;

  const servers = doc.servers ?? [];
  const baseUrl = servers[0]?.url;

  const securitySchemes = (doc.components?.securitySchemes ?? {}) as Record<string, SecurityScheme>;

  const tagSet = new Set<string>();
  for (const op of operations) {
    for (const tag of op.tags) {
      tagSet.add(tag);
    }
  }

  return {
    info: {
      title: doc.info?.title ?? 'Untitled API',
      version: doc.info?.version ?? '0.0.0',
      description: doc.info?.description,
      baseUrl,
    },
    endpointCount,
    schemaCount,
    securitySchemes,
    tags: [...tagSet].sort(),
  };
}
