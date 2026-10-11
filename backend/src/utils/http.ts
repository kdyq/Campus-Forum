import type { Response } from 'express';

export function ok(res: Response, data: unknown = null, message = 'ok'): void {
  res.json({ code: 0, message, data });
}

export function fail(res: Response, code: number, message: string, httpStatus = 200): void {
  res.status(httpStatus).json({ code, message, data: null });
}
