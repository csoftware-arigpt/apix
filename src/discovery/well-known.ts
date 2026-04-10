import { DiscoveryError } from '../shared/errors.js';
import type { OpenAPIDocument } from '../shared/openapi.js';
import { fetchSpec } from './fetcher.js';

const WELL_KNOWN_PATHS = [
  '/.well-known/openapi.json',
  '/.well-known/openapi.yaml',
  '/openapi.json',
  '/openapi.yaml',
  '/swagger.json',
  '/swagger.yaml',
  '/api/openapi.json',
  '/api/openapi.yaml',
  '/api-docs',
  '/docs/api',
  '/api/docs',
  '/v1/openapi.json',
  '/v2/openapi.json',
  '/v3/openapi.json',
];

export function getWellKnownPaths(): string[] {
  return [...WELL_KNOWN_PATHS];
}

function normalizeBaseUrl(input: string): string {
  let url = input.trim();
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = `https://${url}`;
  }
  return url.replace(/\/+$/, '');
}

export async function discoverSpec(
  domainOrUrl: string
): Promise<{ doc: OpenAPIDocument; foundUrl: string }> {
  const baseUrl = normalizeBaseUrl(domainOrUrl);
  const urls = WELL_KNOWN_PATHS.map((path) => `${baseUrl}${path}`);

  const results = await Promise.allSettled(
    urls.map(async (url) => {
      const doc = await fetchSpec(url);
      return { doc, foundUrl: url };
    })
  );

  for (const result of results) {
    if (result.status === 'fulfilled') {
      return result.value;
    }
  }

  throw new DiscoveryError(domainOrUrl);
}
