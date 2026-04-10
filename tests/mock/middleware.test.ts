import { describe, expect, it, vi } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { validateRequest } from '../../src/mock/middleware.js';
import type { OperationInfo } from '../../src/shared/openapi.js';

function mockRes(): Response {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response;
  return res;
}

function baseOp(overrides: Partial<OperationInfo> = {}): OperationInfo {
  return {
    method: 'get',
    path: '/pets/{id}',
    tags: [],
    parameters: [],
    responses: [],
    security: [],
    ...overrides,
  };
}

describe('validateRequest', () => {
  it('calls next when required path param is present', () => {
    const op = baseOp({
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
      ],
    });
    const req = { params: { id: '1' }, query: {}, body: {} } as unknown as Request;
    const res = mockRes();
    const next = vi.fn() as NextFunction;
    validateRequest(op)(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('returns 400 when required path param is missing', () => {
    const op = baseOp({
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
      ],
    });
    const req = { params: {}, query: {}, body: {} } as unknown as Request;
    const res = mockRes();
    const next = vi.fn() as NextFunction;
    validateRequest(op)(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 400 when required query param is missing', () => {
    const op = baseOp({
      parameters: [
        { name: 'limit', in: 'query', required: true, schema: { type: 'integer' } },
      ],
    });
    const req = { params: {}, query: {}, body: {} } as unknown as Request;
    const res = mockRes();
    const next = vi.fn() as NextFunction;
    validateRequest(op)(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 400 when required body is empty', () => {
    const op = baseOp({
      method: 'post',
      requestBody: {
        required: true,
        contentType: 'application/json',
        schema: {},
      },
    });
    const req = { params: {}, query: {}, body: {} } as unknown as Request;
    const res = mockRes();
    const next = vi.fn() as NextFunction;
    validateRequest(op)(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('passes when body is present and required', () => {
    const op = baseOp({
      method: 'post',
      requestBody: {
        required: true,
        contentType: 'application/json',
        schema: {},
      },
    });
    const req = { params: {}, query: {}, body: { name: 'rex' } } as unknown as Request;
    const res = mockRes();
    const next = vi.fn() as NextFunction;
    validateRequest(op)(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('passes through optional params', () => {
    const op = baseOp({
      parameters: [
        { name: 'limit', in: 'query', required: false, schema: { type: 'integer' } },
      ],
    });
    const req = { params: {}, query: {}, body: {} } as unknown as Request;
    const res = mockRes();
    const next = vi.fn() as NextFunction;
    validateRequest(op)(req, res, next);
    expect(next).toHaveBeenCalled();
  });
});
