import type { OpenAPIDocument, SecurityScheme } from './openapi.js';

export type AuthType = 'apiKey' | 'bearer' | 'basic' | 'oauth2' | 'openIdConnect' | 'none';

export interface AuthConfig {
  type: AuthType;
  scheme?: string;
  headerName?: string;
  queryName?: string;
  envVar: string;
  description: string;
}

export function detectAuth(doc: OpenAPIDocument): AuthConfig {
  const securitySchemes = (doc.components?.securitySchemes ?? {}) as Record<string, SecurityScheme>;
  const schemeEntries = Object.entries(securitySchemes);

  if (schemeEntries.length === 0) {
    return { type: 'none', envVar: '', description: 'No authentication required' };
  }

  const [name, scheme] = schemeEntries[0]!;

  if (scheme.type === 'apiKey') {
    if (scheme.in === 'header') {
      return {
        type: 'apiKey',
        headerName: scheme.name,
        envVar: 'APIX_API_KEY',
        description: `API key in header "${scheme.name}"`,
      };
    }
    return {
      type: 'apiKey',
      queryName: scheme.name,
      envVar: 'APIX_API_KEY',
      description: `API key in query parameter "${scheme.name}"`,
    };
  }

  if (scheme.type === 'http') {
    if (scheme.scheme === 'bearer') {
      return {
        type: 'bearer',
        scheme: 'bearer',
        envVar: 'APIX_API_KEY',
        description: `Bearer token authentication`,
      };
    }
    return {
      type: 'basic',
      scheme: 'basic',
      envVar: 'APIX_API_KEY',
      description: `HTTP Basic authentication (base64 user:pass)`,
    };
  }

  if (scheme.type === 'oauth2') {
    return {
      type: 'oauth2',
      envVar: 'APIX_API_KEY',
      description: `OAuth2 — use a pre-obtained access token (see ${name} scheme in spec)`,
    };
  }

  if (scheme.type === 'openIdConnect') {
    return {
      type: 'openIdConnect',
      envVar: 'APIX_API_KEY',
      description: `OpenID Connect — use a pre-obtained access token`,
    };
  }

  return { type: 'none', envVar: '', description: 'No authentication required' };
}
