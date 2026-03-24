import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { userStore, generateId } from '../utils/db';
import { toUserResponse } from '../models/User';
import { AuthenticatedRequest } from '../middleware/authMiddleware';

const SALT_ROUNDS = 10;

export async function createUser(req: Request, res: Response): Promise<void> {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      res.status(400).json({ error: 'name, email, and password are required' });
      return;
    }

    // Check if email already exists
    for (const user of userStore.values()) {
      if (user.email === email) {
        res.status(409).json({ error: 'Email already in use' });
        return;
      }
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const now = new Date();
    const id = generateId();

    const newUser = {
      id,
      name,
      email,
      passwordHash,
      createdAt: now,
      updatedAt: now,
    };

    userStore.set(id, newUser);
    res.status(201).json(toUserResponse(newUser));
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getUserById(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const user = userStore.get(id);

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json(toUserResponse(user));
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function updateUser(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const user = userStore.get(id);

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const { name, email, password } = req.body;
    const now = new Date();

    if (email && email !== user.email) {
      // Check email uniqueness
      for (const existingUser of userStore.values()) {
        if (existingUser.email === email && existingUser.id !== id) {
          res.status(409).json({ error: 'Email already in use' });
          return;
        }
      }
    }

    const updatedUser = {
      ...user,
      name: name || user.name,
      email: email || user.email,
      passwordHash: password ? await bcrypt.hash(password, SALT_ROUNDS) : user.passwordHash,
      updatedAt: now,
    };

    userStore.set(id, updatedUser);
    res.json(toUserResponse(updatedUser));
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function deleteUser(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const user = userStore.get(id);

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    userStore.delete(id);
    // BUG: Does NOT invalidate sessions for deleted user - intentional for experiment
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
}
