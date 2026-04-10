import { describe, it, expect } from 'vitest';
import { generateAuthDocs } from '../../src/mcp/auth.js';
import type { AuthConfig } from '../../src/shared/auth-detector.js';

describe('generateAuthDocs', () => {
  it('returns "No authentication required." for none type', () => {
    const auth: AuthConfig = { type: 'none', envVar: '', description: '' };
    expect(generateAuthDocs(auth)).toBe('No authentication required.');
  });

  it('includes env var reference for apiKey', () => {
    const auth: AuthConfig = {
      type: 'apiKey',
      headerName: 'X-Key',
      envVar: 'MY_KEY',
      description: 'Key in X-Key header',
    };
    const doc = generateAuthDocs(auth);
    expect(doc).toContain('## Authentication');
    expect(doc).toContain('Key in X-Key header');
    expect(doc).toContain('`MY_KEY`');
  });

  it('adds OAuth2 setup steps for oauth2 auth', () => {
    const auth: AuthConfig = {
      type: 'oauth2',
      envVar: 'APIX_API_KEY',
      description: 'oauth',
    };
    const doc = generateAuthDocs(auth);
    expect(doc).toContain('### OAuth2 Setup');
    expect(doc).toContain('Register an OAuth2 application');
    expect(doc).toContain('`APIX_API_KEY`');
  });

  it('does not include OAuth2 section for non-oauth2 auth', () => {
    const auth: AuthConfig = {
      type: 'bearer',
      envVar: 'APIX_API_KEY',
      description: 'bearer',
    };
    expect(generateAuthDocs(auth)).not.toContain('### OAuth2 Setup');
  });
});
