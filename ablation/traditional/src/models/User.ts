export interface UserModel {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserInput {
  name: string;
  email: string;
  password: string;
}

export interface UpdateUserInput {
  name?: string;
  email?: string;
  password?: string;
}

export interface UserResponse {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
  updatedAt: Date;
}

export function toUserResponse(user: UserModel): UserResponse {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}
