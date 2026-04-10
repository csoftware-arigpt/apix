export function toCamelCase(str: string): string {
  return str
    .replace(/[^a-zA-Z0-9]+(.)/g, (_, ch: string) => ch.toUpperCase())
    .replace(/^[A-Z]/, (ch) => ch.toLowerCase());
}

export function toPascalCase(str: string): string {
  const camel = toCamelCase(str);
  return camel.charAt(0).toUpperCase() + camel.slice(1);
}

export function toSnakeCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .toLowerCase();
}

export function toSlug(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function operationToMethodName(method: string, path: string, operationId?: string): string {
  if (operationId) {
    return toCamelCase(operationId.replace(/[^a-zA-Z0-9]/g, '_'));
  }
  const parts = path
    .split('/')
    .filter(Boolean)
    .map((p) => (p.startsWith('{') ? 'By' + toPascalCase(p.slice(1, -1)) : toPascalCase(p)));
  return toCamelCase(`${method}_${parts.join('')}`);
}

export function operationToToolName(method: string, path: string, operationId?: string): string {
  if (operationId) {
    return toSnakeCase(operationId);
  }
  const parts = path
    .split('/')
    .filter((p) => p && !p.startsWith('{'))
    .map((p) => p.replace(/[^a-zA-Z0-9]/g, '_'));
  return `${method}_${parts.join('_')}`.toLowerCase();
}
