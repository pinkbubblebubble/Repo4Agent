/**
 * user.create.handler.ts
 * Capability: user.create
 * Contract: user.contract.ts#CreateUserInput -> UserResponse
 * Side effects: writes_user_store
 * Dependencies: _shared/db
 *
 * INVARIANT INV-001: Password must be hashed with bcrypt (saltRounds >= 10)
 */

import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { userStore, generateId, findUserByEmail } from '../_shared/db';
import { CreateUserInput, toUserResponse } from './user.contract';

const SALT_ROUNDS = 10;

export async function createUserHandler(req: Request, res: Response): Promise<void> {
  const { name, email, password } = req.body as Partial<CreateUserInput>;

  if (!name || !email || !password) {
    res.status(400).json({ error: 'name, email, and password are required' });
    return;
  }

  if (findUserByEmail(email)) {
    res.status(409).json({ error: 'Email already in use' });
    return;
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const now = new Date();
  const id = generateId();

  const user = { id, name, email, passwordHash, createdAt: now, updatedAt: now };
  userStore.set(id, user);

  res.status(201).json(toUserResponse(user));
}
