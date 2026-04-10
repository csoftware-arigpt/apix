import type { OpenAPI, OpenAPIV3, OpenAPIV3_1 } from 'openapi-types';

export type OpenAPIDocument = OpenAPIV3.Document | OpenAPIV3_1.Document;
export type OpenAPISpec = OpenAPI.Document;

export type SecurityScheme =
  | OpenAPIV3.SecuritySchemeObject
  | OpenAPIV3_1.SecuritySchemeObject;

type PathItemObject = OpenAPIV3.PathItemObject | OpenAPIV3_1.PathItemObject;
type OperationObject = OpenAPIV3.OperationObject | OpenAPIV3_1.OperationObject;
type ParameterObject = OpenAPIV3.ParameterObject | OpenAPIV3_1.ParameterObject;
type ReferenceObject = OpenAPIV3.ReferenceObject | OpenAPIV3_1.ReferenceObject;
type RequestBodyObject = OpenAPIV3.RequestBodyObject | OpenAPIV3_1.RequestBodyObject;
type ResponseObject = OpenAPIV3.ResponseObject | OpenAPIV3_1.ResponseObject;
type SecurityRequirementObject =
  | OpenAPIV3.SecurityRequirementObject
  | OpenAPIV3_1.SecurityRequirementObject;

export interface SpecInfo {
  title: string;
  version: string;
  description?: string;
  baseUrl?: string;
}

export interface SpecSummary {
  info: SpecInfo;
  endpointCount: number;
  schemaCount: number;
  securitySchemes: Record<string, SecurityScheme>;
  tags: string[];
}

export interface OperationInfo {
  method: string;
  path: string;
  operationId?: string;
  summary?: string;
  description?: string;
  tags: string[];
  parameters: ParameterInfo[];
  requestBody?: RequestBodyInfo;
  responses: ResponseInfo[];
  security: SecurityRequirementObject[];
}

export interface ParameterInfo {
  name: string;
  in: 'path' | 'query' | 'header' | 'cookie';
  required: boolean;
  description?: string;
  schema: Record<string, unknown>;
}

export interface RequestBodyInfo {
  required: boolean;
  description?: string;
  contentType: string;
  schema: Record<string, unknown>;
}

export interface ResponseInfo {
  statusCode: string;
  description?: string;
  contentType?: string;
  schema?: Record<string, unknown>;
}

const HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options'] as const;

function isReferenceObject(value: unknown): value is ReferenceObject {
  return !!value && typeof value === 'object' && '$ref' in value;
}

export function extractOperations(doc: OpenAPIDocument): OperationInfo[] {
  const operations: OperationInfo[] = [];
  const paths = doc.paths ?? {};

  for (const [path, pathItem] of Object.entries(paths)) {
    if (!pathItem) continue;
    const typedPathItem = pathItem as PathItemObject;

    for (const method of HTTP_METHODS) {
      const operation = (typedPathItem as Record<string, unknown>)[method] as OperationObject | undefined;
      if (!operation) continue;

      const parameters: ParameterInfo[] = [
        ...(typedPathItem.parameters ?? []),
        ...(operation.parameters ?? []),
      ]
        .filter((parameter): parameter is ParameterObject => !isReferenceObject(parameter))
        .map((p) => ({
          name: p.name,
          in: p.in as ParameterInfo['in'],
          required: p.required ?? p.in === 'path',
          description: p.description,
          schema: (p.schema as Record<string, unknown>) ?? { type: 'string' },
        }));

      let requestBody: RequestBodyInfo | undefined;
      if (operation.requestBody && !isReferenceObject(operation.requestBody)) {
        const rb = operation.requestBody as RequestBodyObject;
        const contentType = Object.keys(rb.content ?? {})[0] ?? 'application/json';
        const mediaType = rb.content?.[contentType];
        requestBody = {
          required: rb.required ?? false,
          description: rb.description,
          contentType,
          schema: (mediaType?.schema as Record<string, unknown>) ?? {},
        };
      }

      const responses: ResponseInfo[] = Object.entries(operation.responses ?? {})
        .filter(([, response]) => !isReferenceObject(response))
        .map(([statusCode, resp]) => {
          const response = resp as ResponseObject;
          const contentType = Object.keys(response.content ?? {})[0];
          const mediaType = contentType ? response.content?.[contentType] : undefined;
          return {
            statusCode,
            description: response.description,
            contentType,
            schema: mediaType?.schema as Record<string, unknown> | undefined,
          };
        });

      operations.push({
        method,
        path,
        operationId: operation.operationId,
        summary: operation.summary,
        description: operation.description,
        tags: operation.tags ?? [],
        parameters,
        requestBody,
        responses,
        security: (operation.security ?? doc.security ?? []) as SecurityRequirementObject[],
      });
    }
  }

  return operations;
}
