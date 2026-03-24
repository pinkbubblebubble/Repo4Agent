/**
 * user.contract.ts - Input/output type contracts for user operations
 *
 * All handlers in this module must conform to these contracts.
 * Do not change response shapes without updating tests and MANIFEST.yaml
 */

// Input contracts
export interface CreateUserInput {
  name: string;
  email: string;
  password: string;
}

export interface GetUserInput {
  id: string; // URL param
}

export interface UpdateUserInput {
  id: string; // URL param
  name?: string;
  email?: string;
  password?: string;
}

export interface DeleteUserInput {
  id: string; // URL param
}

// Output contracts
export interface UserResponse {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
  updatedAt: Date;
  // INVARIANT INV-001: password and passwordHash must NEVER appear here
}

// Utility: strips sensitive fields from UserRecord
export function toUserResponse(user: {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  createdAt: Date;
  updatedAt: Date;
}): UserResponse {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}
