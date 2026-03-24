import { v4 as uuidv4 } from 'uuid';

export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Session {
  id: string;
  userId: string;
  token: string;
  createdAt: Date;
}

// In-memory stores
export const userStore = new Map<string, User>();
export const sessionStore = new Map<string, Session>();

export function generateId(): string {
  return uuidv4();
}

export function clearStores(): void {
  userStore.clear();
  sessionStore.clear();
}
