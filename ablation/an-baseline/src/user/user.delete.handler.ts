/**
 * user.delete.handler.ts
 * Capability: user.delete
 * Contract: user.contract.ts#DeleteUserInput -> 204 No Content
 * Side effects: writes_user_store
 * Dependencies: _shared/db
 *
 * KNOWN ISSUE - INV-002 VIOLATED:
 *   This handler does NOT invalidate active sessions for the deleted user.
 *   Sessions for this userId will remain in sessionStore after deletion.
 *   FIX: Call deleteSessionsByUserId(id) before userStore.delete(id)
 *   See: .agent/INVARIANTS.md#INV-002
 */

import { Response } from 'express';
import { userStore } from '../_shared/db';
import { AuthenticatedRequest } from '../auth/auth.contract';

export async function deleteUserHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { id } = req.params;
  const user = userStore.get(id);

  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  userStore.delete(id);
  // BUG INV-002: deleteSessionsByUserId(id) is intentionally NOT called here
  res.status(204).send();
}
