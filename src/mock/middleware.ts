import type { Request, Response, NextFunction } from 'express';
import type { OperationInfo } from '../shared/openapi.js';

export function validateRequest(operation: OperationInfo) {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Validate required path params
    for (const param of operation.parameters) {
      if (param.in === 'path' && param.required) {
        if (!req.params[param.name]) {
          res.status(400).json({
            error: `Missing required path parameter: ${param.name}`,
          });
          return;
        }
      }
    }

    // Validate required query params
    for (const param of operation.parameters) {
      if (param.in === 'query' && param.required) {
        if (!req.query[param.name]) {
          res.status(400).json({
            error: `Missing required query parameter: ${param.name}`,
          });
          return;
        }
      }
    }

    // Validate required body
    if (operation.requestBody?.required) {
      if (!req.body || Object.keys(req.body as Record<string, unknown>).length === 0) {
        res.status(400).json({ error: 'Request body is required' });
        return;
      }
    }

    next();
  };
}
