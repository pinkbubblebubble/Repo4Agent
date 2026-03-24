export interface SessionModel {
  id: string;
  userId: string;
  token: string;
  createdAt: Date;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  userId: string;
}
