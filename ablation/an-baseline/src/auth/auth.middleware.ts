/**
 * auth.middleware.ts
 * INVARIANT INV-003: Validates session token from Authorization header
 * Applied to: all /users/* routes except POST /users (registration)
 */

import { Response, NextFunction } from 'express';
import { findSessionByToken } from '../_shared/db';
import { AuthenticatedRequest } from './auth.contract';

export function authMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authorization header required' });
    return;
  }

  const token = authHeader.substring(7);
  const session = findSessionByToken(token);

  if (!session) {
    res.status(401).json({ error: 'Invalid or expired token' });
    return;
  }

  req.userId = session.userId;
  req.sessionToken = token;
  next();
}
