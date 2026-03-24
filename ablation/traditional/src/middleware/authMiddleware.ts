import { Request, Response, NextFunction } from 'express';
import { sessionStore } from '../utils/db';

export interface AuthenticatedRequest extends Request {
  userId?: string;
  sessionToken?: string;
}

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

  // Find session by token
  let foundSession = null;
  for (const session of sessionStore.values()) {
    if (session.token === token) {
      foundSession = session;
      break;
    }
  }

  if (!foundSession) {
    res.status(401).json({ error: 'Invalid or expired token' });
    return;
  }

  req.userId = foundSession.userId;
  req.sessionToken = token;
  next();
}
