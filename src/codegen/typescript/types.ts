import type { OpenAPIDocument } from '../../shared/openapi.js';
import { toPascalCase, toCamelCase } from '../../shared/naming.js';

interface SchemaObject {
  type?: string;
  format?: string;
  description?: string;
  properties?: Record<string, SchemaObject>;
  required?: string[];
  items?: SchemaObject;
  enum?: unknown[];
  allOf?: SchemaObject[];
  oneOf?: SchemaObject[];
  anyOf?: SchemaObject[];
  nullable?: boolean;
  $ref?: string;
  additionalProperties?: boolean | SchemaObject;
}

export function generateTypeString(schema: SchemaObject, indent: number = 0): string {
  if (schema.enum) {
    return schema.enum.map((v) => (typeof v === 'string' ? `'${v}'` : String(v))).join(' | ');
  }

  if (schema.allOf) {
    return schema.allOf.map((s) => generateTypeString(s, indent)).join(' & ');
  }

  if (schema.oneOf || schema.anyOf) {
    const variants = schema.oneOf ?? schema.anyOf ?? [];
    return variants.map((s) => generateTypeString(s, indent)).join(' | ');
  }

  if (schema.type === 'array') {
    const itemType = schema.items ? generateTypeString(schema.items, indent) : 'unknown';
    return `Array<${itemType}>`;
  }

  if (schema.type === 'object' || schema.properties) {
    return generateInlineObject(schema, indent);
  }

  switch (schema.type) {
    case 'string':
      return 'string';
    case 'number':
    case 'integer':
      return 'number';
    case 'boolean':
      return 'boolean';
    default:
      return 'unknown';
  }
}

function generateInlineObject(schema: SchemaObject, indent: number): string {
  const props = schema.properties;
  if (!props || Object.keys(props).length === 0) {
    if (schema.additionalProperties === true || typeof schema.additionalProperties === 'object') {
      const valType =
        typeof schema.additionalProperties === 'object'
          ? generateTypeString(schema.additionalProperties, indent)
          : 'unknown';
      return `Record<string, ${valType}>`;
    }
    return 'Record<string, unknown>';
  }

  const pad = '  '.repeat(indent + 1);
  const closePad = '  '.repeat(indent);
  const required = new Set(schema.required ?? []);
  const lines: string[] = ['{'];

  for (const [name, prop] of Object.entries(props)) {
    const propName = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(name) ? name : `'${name}'`;
    const optional = required.has(name) ? '' : '?';
    let typeStr = generateTypeString(prop, indent + 1);
    if (prop.nullable) {
      typeStr += ' | null';
    }
    if (prop.description) {
      lines.push(`${pad}/** ${prop.description} */`);
    }
    lines.push(`${pad}${propName}${optional}: ${typeStr};`);
  }

  lines.push(`${closePad}}`);
  return lines.join('\n');
}

export function generateTypes(doc: OpenAPIDocument): string {
  const schemas = (doc.components?.schemas ?? {}) as Record<string, SchemaObject>;
  const lines: string[] = [];

  for (const [name, schema] of Object.entries(schemas)) {
    const typeName = toPascalCase(name);

    if (schema.description) {
      lines.push(`/** ${schema.description} */`);
    }

    if (schema.enum) {
      const enumType = generateTypeString(schema);
      lines.push(`export type ${typeName} = ${enumType};`);
    } else {
      const typeBody = generateTypeString(schema, 0);
      if (typeBody.startsWith('{')) {
        lines.push(`export interface ${typeName} ${typeBody}`);
      } else {
        lines.push(`export type ${typeName} = ${typeBody};`);
      }
    }

    lines.push('');
  }

  return lines.join('\n');
}
