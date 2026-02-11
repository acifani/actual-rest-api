import { timingSafeEqual } from 'crypto';
import type { NextFunction, Request, Response } from 'express';

const authToken = process.env.AUTH_TOKEN;
const authEnabled = !!authToken && authToken.length > 0;

function safeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

export function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  if (authEnabled) {
    const incomingToken = req.headers['authorization'] || req.query['token'];
    if (
      typeof incomingToken !== 'string' ||
      !safeCompare(incomingToken, authToken!)
    ) {
      res.sendStatus(403);
      return;
    }
  }

  next();
}
