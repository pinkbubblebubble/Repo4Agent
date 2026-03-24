import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { userStore, sessionStore, generateId } from '../utils/db';
import { AuthenticatedRequest } from '../middleware/authMiddleware';

export async function login(req: Request, res: Response): Promise<void> {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'email and password are required' });
      return;
    }

    // Find user by email
    let foundUser = null;
    for (const user of userStore.values()) {
      if (user.email === email) {
        foundUser = user;
        break;
      }
    }

    if (!foundUser) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const passwordMatch = await bcrypt.compare(password, foundUser.passwordHash);
    if (!passwordMatch) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const sessionId = generateId();
    const token = generateId();
    const session = {
      id: sessionId,
      userId: foundUser.id,
      token,
      createdAt: new Date(),
    };

    sessionStore.set(sessionId, session);

    res.json({
      token,
      userId: foundUser.id,
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function logout(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const token = req.sessionToken;

    // Find and remove session by token
    for (const [sessionId, session] of sessionStore.entries()) {
      if (session.token === token) {
        sessionStore.delete(sessionId);
        break;
      }
    }

    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
}
