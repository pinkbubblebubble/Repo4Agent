/**
 * _shared/db.ts - In-memory data stores
 *
 * IMPACT: ALL modules depend on this
 * INTERFACE CONTRACT: Do not change exported function signatures or store types
 * SIDE EFFECTS: Direct mutation of in-memory Maps
 *
 * See .agent/IMPACT_MAP.yaml for full impact documentation
 */

import { v4 as uuidv4 } from 'uuid';

export interface UserRecord {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SessionRecord {
  id: string;
  userId: string;
  token: string;
  createdAt: Date;
}

// Stores - exported for direct access (read-only usage) or via helper functions
export const userStore = new Map<string, UserRecord>();
export const sessionStore = new Map<string, SessionRecord>();

// Helper functions
export function generateId(): string {
  return uuidv4();
}

export function findUserByEmail(email: string): UserRecord | undefined {
  for (const user of userStore.values()) {
    if (user.email === email) return user;
  }
  return undefined;
}

export function findSessionByToken(token: string): SessionRecord | undefined {
  for (const session of sessionStore.values()) {
    if (session.token === token) return session;
  }
  return undefined;
}

export function deleteSessionsByUserId(userId: string): void {
  for (const [id, session] of sessionStore.entries()) {
    if (session.userId === userId) {
      sessionStore.delete(id);
    }
  }
}

// Test utility - clears all stores between tests
export function clearStores(): void {
  userStore.clear();
  sessionStore.clear();
}
