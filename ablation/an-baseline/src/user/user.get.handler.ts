/**
 * user.get.handler.ts
 * Capability: user.get
 * Contract: user.contract.ts#GetUserInput -> UserResponse
 * Side effects: none (read-only)
 * Dependencies: _shared/db
 */

import { Response } from 'express';
import { userStore } from '../_shared/db';
import { toUserResponse } from './user.contract';
import { AuthenticatedRequest } from '../auth/auth.contract';

export async function getUserHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { id } = req.params;
  const user = userStore.get(id);

  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  res.json(toUserResponse(user));
}
