/**
 * auth.contract.ts - Input/output type contracts for auth operations
 *
 * Also defines the AuthenticatedRequest extension for authenticated routes.
 */

import { Request } from 'express';

// Input contracts
export interface LoginInput {
  email: string;
  password: string;
}

export interface LogoutInput {
  token: string; // from Authorization header
}

// Output contracts
export interface LoginResponse {
  token: string;
  userId: string;
}

// Express request extension for authenticated routes
export interface AuthenticatedRequest extends Request {
  userId?: string;
  sessionToken?: string;
}
