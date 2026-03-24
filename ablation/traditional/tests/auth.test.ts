import request from 'supertest';
import app from '../src/app';
import { clearStores } from '../src/utils/db';

describe('Auth API', () => {
  beforeEach(async () => {
    clearStores();

    // Create a test user
    await request(app)
      .post('/users')
      .send({ name: 'Auth Test User', email: 'auth@example.com', password: 'password123' });
  });

  describe('POST /auth/login - Login', () => {
    it('should login successfully with valid credentials', async () => {
      const res = await request(app)
        .post('/auth/login')
        .send({ email: 'auth@example.com', password: 'password123' });

      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();
      expect(res.body.userId).toBeDefined();
    });

    it('should return 401 with invalid password', async () => {
      const res = await request(app)
        .post('/auth/login')
        .send({ email: 'auth@example.com', password: 'wrongpassword' });

      expect(res.status).toBe(401);
    });

    it('should return 401 with non-existent email', async () => {
      const res = await request(app)
        .post('/auth/login')
        .send({ email: 'nonexistent@example.com', password: 'password123' });

      expect(res.status).toBe(401);
    });

    it('should return 400 if required fields are missing', async () => {
      const res = await request(app)
        .post('/auth/login')
        .send({ email: 'auth@example.com' });

      expect(res.status).toBe(400);
    });
  });

  describe('POST /auth/logout - Logout', () => {
    it('should logout successfully', async () => {
      const loginRes = await request(app)
        .post('/auth/login')
        .send({ email: 'auth@example.com', password: 'password123' });

      const token = loginRes.body.token;

      const logoutRes = await request(app)
        .post('/auth/logout')
        .set('Authorization', `Bearer ${token}`);

      expect(logoutRes.status).toBe(204);
    });

    it('should return 401 when logging out without token', async () => {
      const res = await request(app).post('/auth/logout');
      expect(res.status).toBe(401);
    });

    it('should invalidate token after logout', async () => {
      const loginRes = await request(app)
        .post('/auth/login')
        .send({ email: 'auth@example.com', password: 'password123' });

      const token = loginRes.body.token;
      const userId = loginRes.body.userId;

      // Logout
      await request(app)
        .post('/auth/logout')
        .set('Authorization', `Bearer ${token}`);

      // Try to use the token after logout
      const res = await request(app)
        .get(`/users/${userId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(401);
    });
  });

  describe('Auth Protection', () => {
    it('should protect GET /users/:id', async () => {
      const res = await request(app).get('/users/some-id');
      expect(res.status).toBe(401);
    });

    it('should protect PUT /users/:id', async () => {
      const res = await request(app)
        .put('/users/some-id')
        .send({ name: 'Updated' });
      expect(res.status).toBe(401);
    });

    it('should protect DELETE /users/:id', async () => {
      const res = await request(app).delete('/users/some-id');
      expect(res.status).toBe(401);
    });

    it('should protect POST /auth/logout', async () => {
      const res = await request(app).post('/auth/logout');
      expect(res.status).toBe(401);
    });

    it('should allow POST /users without auth (registration)', async () => {
      const res = await request(app)
        .post('/users')
        .send({ name: 'New User', email: 'new@example.com', password: 'pass123' });

      expect(res.status).toBe(201);
    });

    it('should reject invalid bearer token', async () => {
      const res = await request(app)
        .get('/users/some-id')
        .set('Authorization', 'Bearer invalid-token-here');

      expect(res.status).toBe(401);
    });
  });
});
