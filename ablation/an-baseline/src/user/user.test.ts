import request from 'supertest';
import app from '../app';
import { clearStores } from '../_shared/db';

describe('user capabilities', () => {
  let authToken: string;
  let userId: string;

  beforeEach(async () => {
    clearStores();

    const createRes = await request(app)
      .post('/users')
      .send({ name: 'Test User', email: 'test@example.com', password: 'password123' });

    userId = createRes.body.id;

    const loginRes = await request(app)
      .post('/auth/login')
      .send({ email: 'test@example.com', password: 'password123' });

    authToken = loginRes.body.token;
  });

  describe('user.create', () => {
    it('creates user and returns response without password fields', async () => {
      const res = await request(app)
        .post('/users')
        .send({ name: 'Alice', email: 'alice@example.com', password: 'securepass' });

      expect(res.status).toBe(201);
      expect(res.body.id).toBeDefined();
      expect(res.body.name).toBe('Alice');
      expect(res.body.email).toBe('alice@example.com');
      // INV-001: no password in response
      expect(res.body.password).toBeUndefined();
      expect(res.body.passwordHash).toBeUndefined();
    });

    it('returns 400 if required fields are missing', async () => {
      const res = await request(app).post('/users').send({ name: 'Alice' });
      expect(res.status).toBe(400);
    });

    it('returns 409 if email already in use', async () => {
      const res = await request(app)
        .post('/users')
        .send({ name: 'Dup', email: 'test@example.com', password: 'pass' });
      expect(res.status).toBe(409);
    });
  });

  describe('user.get', () => {
    it('returns user when authenticated', async () => {
      const res = await request(app)
        .get(`/users/${userId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(userId);
      expect(res.body.passwordHash).toBeUndefined();
    });

    it('returns 401 without token (INV-003)', async () => {
      const res = await request(app).get(`/users/${userId}`);
      expect(res.status).toBe(401);
    });

    it('returns 404 for non-existent user', async () => {
      const res = await request(app)
        .get('/users/no-such-id')
        .set('Authorization', `Bearer ${authToken}`);
      expect(res.status).toBe(404);
    });
  });

  describe('user.update', () => {
    it('updates user fields', async () => {
      const res = await request(app)
        .put(`/users/${userId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Updated' });

      expect(res.status).toBe(200);
      expect(res.body.name).toBe('Updated');
      expect(res.body.passwordHash).toBeUndefined();
    });

    it('returns 401 without token (INV-003)', async () => {
      const res = await request(app).put(`/users/${userId}`).send({ name: 'X' });
      expect(res.status).toBe(401);
    });

    it('returns 404 for non-existent user', async () => {
      const res = await request(app)
        .put('/users/no-such-id')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'X' });
      expect(res.status).toBe(404);
    });
  });

  describe('user.delete', () => {
    it('deletes user successfully', async () => {
      const res = await request(app)
        .delete(`/users/${userId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(204);
    });

    it('returns 401 without token (INV-003)', async () => {
      const res = await request(app).delete(`/users/${userId}`);
      expect(res.status).toBe(401);
    });

    it('returns 404 for non-existent user', async () => {
      const res = await request(app)
        .delete('/users/no-such-id')
        .set('Authorization', `Bearer ${authToken}`);
      expect(res.status).toBe(404);
    });
  });
});
