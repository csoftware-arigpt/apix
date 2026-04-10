import type { AuthConfig } from '../shared/auth-detector.js';

export function generateAuthDocs(auth: AuthConfig): string {
  if (auth.type === 'none') {
    return 'No authentication required.';
  }

  const lines: string[] = [];
  lines.push('## Authentication');
  lines.push('');
  lines.push(auth.description);
  lines.push('');
  lines.push(`Set the \`${auth.envVar}\` environment variable before starting the server.`);
  lines.push('');

  if (auth.type === 'oauth2') {
    lines.push('### OAuth2 Setup');
    lines.push('');
    lines.push('1. Register an OAuth2 application with the API provider');
    lines.push('2. Complete the OAuth2 flow to obtain an access token');
    lines.push(`3. Set \`${auth.envVar}\` to the access token value`);
    lines.push('');
  }

  return lines.join('\n');
}
