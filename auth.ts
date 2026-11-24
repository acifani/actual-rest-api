import { createHash, timingSafeEqual } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

function sha256(value: string): Buffer {
  return createHash('sha256').update(value).digest();
}

const authToken = process.env.AUTH_TOKEN;
const expectedDigest = authToken ? sha256(authToken) : undefined;
export const authEnabled = expectedDigest !== undefined;

function incomingToken(req: Request): string | undefined {
  const header = req.headers.authorization;
  if (header !== undefined) return /^Bearer +(.+)$/i.exec(header)?.[1];
  const token = req.query.token;
  return typeof token === 'string' ? token : undefined;
}

export function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  if (expectedDigest) {
    const token = incomingToken(req);
    if (token === undefined || !timingSafeEqual(sha256(token), expectedDigest)) {
      res.set('WWW-Authenticate', 'Bearer').sendStatus(401);
      return;
    }
  }

  next();
}
