/**
 * auth.login.handler.ts
 * Capability: auth.login
 * Contract: auth.contract.ts#LoginInput -> LoginResponse
 * Side effects: writes_session_store
 * Dependencies: _shared/db, user.get (reads user_store)
 */

import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { sessionStore, generateId, findUserByEmail } from '../_shared/db';
import { LoginInput, LoginResponse } from './auth.contract';

export async function loginHandler(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body as Partial<LoginInput>;

  if (!email || !password) {
    res.status(400).json({ error: 'email and password are required' });
    return;
  }

  const user = findUserByEmail(email);
  if (!user) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  const passwordMatch = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatch) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  const sessionId = generateId();
  const token = generateId();
  sessionStore.set(sessionId, {
    id: sessionId,
    userId: user.id,
    token,
    createdAt: new Date(),
  });

  const response: LoginResponse = { token, userId: user.id };
  res.json(response);
}
