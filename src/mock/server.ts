import type { OpenAPIDocument } from '../shared/openapi.js';

export interface MockServerOptions {
  port?: number;
  seed?: number;
}

export async function startMockServer(
  doc: OpenAPIDocument,
  options: MockServerOptions = {}
): Promise<void> {
  // Full implementation in Phase 5
  const { createMockApp } = await import('./app.js');
  const app = createMockApp(doc, options);
  const port = options.port ?? 4010;

  return new Promise((resolve) => {
    app.listen(port, () => {
      resolve();
    });
  });
}
