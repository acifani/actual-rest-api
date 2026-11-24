import { createHash, timingSafeEqual } from 'node:crypto';
import type { Request, RequestHandler } from 'express';
import { HttpError } from './errors.ts';

const sha256 = (value: string) => createHash('sha256').update(value).digest();

function incomingToken(req: Request) {
  const header = req.headers.authorization;
  if (header !== undefined) return /^Bearer +(.+)$/i.exec(header)?.[1];
  return typeof req.query.token === 'string' ? req.query.token : undefined;
}

export function createAuth(token: string): RequestHandler {
  const expected = sha256(token);
  return (req, res, next) => {
    const incoming = incomingToken(req);
    if (incoming === undefined || !timingSafeEqual(sha256(incoming), expected)) {
      res.set('WWW-Authenticate', 'Bearer');
      throw new HttpError(401, 'Missing or invalid token');
    }
    next();
  };
}
