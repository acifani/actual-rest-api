import type { Request, Response, NextFunction } from 'express';

const authToken = process.env.AUTH_TOKEN;
const authEnabled = !!authToken && authToken.length > 0;

export function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  if (authEnabled) {
    const incomingToken = req.headers['authorization'] || req.query['token'];
    if (incomingToken !== authToken) {
      return res.sendStatus(403);
    }
  }

  return next();
}
