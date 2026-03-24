/**
 * user.update.handler.ts
 * Capability: user.update
 * Contract: user.contract.ts#UpdateUserInput -> UserResponse
 * Side effects: writes_user_store
 * Dependencies: _shared/db
 *
 * INVARIANT INV-001: If password is updated, must re-hash with bcrypt
 */

import { Response } from 'express';
import bcrypt from 'bcrypt';
import { userStore, findUserByEmail } from '../_shared/db';
import { UpdateUserInput, toUserResponse } from './user.contract';
import { AuthenticatedRequest } from '../auth/auth.contract';

const SALT_ROUNDS = 10;

export async function updateUserHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { id } = req.params;
  const { name, email, password } = req.body as Partial<UpdateUserInput>;

  const user = userStore.get(id);
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  if (email && email !== user.email) {
    const existing = findUserByEmail(email);
    if (existing && existing.id !== id) {
      res.status(409).json({ error: 'Email already in use' });
      return;
    }
  }

  const updatedUser = {
    ...user,
    name: name || user.name,
    email: email || user.email,
    passwordHash: password ? await bcrypt.hash(password, SALT_ROUNDS) : user.passwordHash,
    updatedAt: new Date(),
  };

  userStore.set(id, updatedUser);
  res.json(toUserResponse(updatedUser));
}
