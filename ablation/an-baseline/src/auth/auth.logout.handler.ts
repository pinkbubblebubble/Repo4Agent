/**
 * auth.logout.handler.ts
 * Capability: auth.logout
 * Contract: auth.contract.ts#LogoutInput -> 204 No Content
 * Side effects: writes_session_store (deletes session)
 * Dependencies: _shared/db
 */

import { Response } from 'express';
import { sessionStore } from '../_shared/db';
import { AuthenticatedRequest } from './auth.contract';

export async function logoutHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  const token = req.sessionToken;

  for (const [sessionId, session] of sessionStore.entries()) {
    if (session.token === token) {
      sessionStore.delete(sessionId);
      break;
    }
  }

  res.status(204).send();
}
