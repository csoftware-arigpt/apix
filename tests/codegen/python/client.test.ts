import { describe, expect, it } from 'vitest';
import { generatePythonClient } from '../../../src/codegen/python/client.js';
import type { OpenAPIDocument, SpecSummary } from '../../../src/shared/openapi.js';

const summary: SpecSummary = {
  info: {
    title: 'Petstore',
    version: '1.0.0',
    baseUrl: 'https://api.petstore.test',
  },
  endpointCount: 5,
  schemaCount: 4,
  securitySchemes: {},
  tags: ['pets', 'admin'],
};

function makeDoc(): OpenAPIDocument {
  return {
    openapi: '3.0.0',
    info: { title: 'Petstore', version: '1.0.0' },
    paths: {
      '/pets': {
        get: {
          operationId: 'listPets',
          tags: ['pets'],
          parameters: [
            { name: 'limit', in: 'query', required: false, schema: { type: 'integer' } },
            { name: 'cursor', in: 'query', required: true, schema: { type: 'string' } },
          ],
          responses: {
            '200': {
              description: 'ok',
              content: {
                'application/json': {
                  schema: {
                    type: 'array',
                    items: { $ref: '#/components/schemas/Pet' },
                  },
                },
              },
            },
          },
        },
        post: {
          operationId: 'createPet',
          tags: ['pets'],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/NewPet' },
              },
            },
          },
          responses: {
            '201': {
              description: 'created',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Pet' },
                },
              },
            },
          },
        },
      },
      '/pets/{petId}': {
        get: {
          operationId: 'getPet',
          tags: ['pets'],
          parameters: [
            { name: 'petId', in: 'path', required: true, schema: { type: 'string' } },
          ],
          responses: {
            '200': {
              description: 'ok',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Pet' },
                },
              },
            },
          },
        },
        delete: {
          operationId: 'deletePet',
          tags: ['pets'],
          parameters: [
            { name: 'petId', in: 'path', required: true, schema: { type: 'string' } },
          ],
          responses: {
            '204': { description: 'deleted' },
          },
        },
      },
      '/status': {
        get: {
          operationId: 'getStatus',
          tags: ['admin'],
          responses: {
            '200': {
              description: 'ok',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/StatusEnvelope' },
                },
              },
            },
          },
        },
      },
    },
    components: {
      schemas: {
        Pet: {
          type: 'object',
          description: 'A pet in the catalog',
          properties: {
            id: { type: 'integer', description: 'Stable ID' },
            name: { type: 'string' },
            status: { type: 'string', enum: ['available', 'pending'] },
          },
          required: ['id', 'name'],
        },
        NewPet: {
          allOf: [
            { $ref: '#/components/schemas/Pet' },
            {
              type: 'object',
              properties: {
                nickname: { type: 'string', nullable: true },
              },
            },
          ],
        },
        StatusEnvelope: {
          type: 'object',
          properties: {
            state: { $ref: '#/components/schemas/Status' },
            metadata: {
              type: 'object',
              additionalProperties: { type: 'string' },
            },
          },
          required: ['state'],
        },
        Status: {
          type: 'string',
          enum: ['ready', 'warming'],
        },
      },
    },
  } as unknown as OpenAPIDocument;
}

describe('generatePythonClient', () => {
  it('matches the full client snapshot', () => {
    const output = generatePythonClient(makeDoc(), summary);

    expect(output).toContain('class ApiError(Exception):');
    expect(output).toContain('time.sleep(0.5 * (2 ** attempt))');
    expect(output).toContain('requests.request(method, url');
    expect(output).toContain('class PetRequired(TypedDict):');
    expect(output).toContain('class NewPet(Pet, total=False):');
    expect(output).toContain('Status: TypeAlias = Literal["ready", "warming"]');
    expect(output).toContain('def list_pets(self, cursor: str, limit: Optional[int] = None) -> list[Pet]:');
    expect(output).toContain('def delete_pet(self, pet_id: str) -> None:');
    expect(output).toMatchSnapshot();
  });

  it('matches the filtered snapshot', () => {
    const output = generatePythonClient(makeDoc(), summary, ['admin']);

    expect(output).toContain('def get_status(self) -> StatusEnvelope:');
    expect(output).not.toContain('def list_pets(');
    expect(output).toMatchSnapshot();
  });
});
