import express from 'express';
import type { OpenAPIDocument } from '../shared/openapi.js';
import { extractOperations } from '../shared/openapi.js';
import { generateFakeData } from './faker.js';
import { validateRequest } from './middleware.js';
import { logger } from '../cli/utils/logger.js';
import chalk from 'chalk';
import type { MockServerOptions } from './server.js';

export function createMockApp(
  doc: OpenAPIDocument,
  options: MockServerOptions = {}
): express.Application {
  const app = express();
  app.use(express.json());

  // CORS
  app.use((_req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (_req.method === 'OPTIONS') {
      res.sendStatus(204);
      return;
    }
    next();
  });

  const operations = extractOperations(doc);
  const routes: string[] = [];

  for (const op of operations) {
    const expressPath = op.path.replace(/\{([^}]+)\}/g, ':$1');
    const successResponse = op.responses.find((r) => r.statusCode.startsWith('2'));
    const statusCode = successResponse ? parseInt(successResponse.statusCode, 10) : 200;
    const responseSchema = successResponse?.schema;

    const method = op.method as 'get' | 'post' | 'put' | 'patch' | 'delete';
    const desc = op.summary || op.operationId || `${op.method} ${op.path}`;

    routes.push(
      `  ${chalk.green(op.method.toUpperCase().padEnd(7))} ${op.path.padEnd(35)} → ${statusCode} (${desc})`
    );

    app[method](expressPath, validateRequest(op), (_req, res) => {
      if (statusCode === 204) {
        res.status(204).end();
        return;
      }
      if (responseSchema) {
        const data = generateFakeData(responseSchema, options.seed);
        res.status(statusCode).json(data);
      } else {
        res.status(statusCode).json({});
      }
    });
  }

  // Log after server starts
  const port = options.port ?? 4010;
  process.nextTick(() => {
    logger.newline();
    logger.success(`Mock server running on http://localhost:${port}`);
    logger.newline();
    process.stderr.write(`Available endpoints:\n`);
    for (const route of routes) {
      process.stderr.write(`${route}\n`);
    }
    logger.newline();
  });

  return app;
}
