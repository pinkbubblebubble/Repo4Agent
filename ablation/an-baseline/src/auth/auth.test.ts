import request from 'supertest';
import app from '../app';
import { clearStores } from '../_shared/db';

describe('auth capabilities', () => {
  beforeEach(async () => {
    clearStores();

    await request(app)
      .post('/users')
      .send({ name: 'Auth User', email: 'auth@example.com', password: 'password123' });
  });

  describe('auth.login', () => {
    it('returns token and userId on valid credentials', async () => {
      const res = await request(app)
        .post('/auth/login')
        .send({ email: 'auth@example.com', password: 'password123' });

      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();
      expect(res.body.userId).toBeDefined();
    });

    it('returns 401 on wrong password', async () => {
      const res = await request(app)
        .post('/auth/login')
        .send({ email: 'auth@example.com', password: 'wrong' });
      expect(res.status).toBe(401);
    });

    it('returns 401 on unknown email', async () => {
      const res = await request(app)
        .post('/auth/login')
        .send({ email: 'nobody@example.com', password: 'pass' });
      expect(res.status).toBe(401);
    });

    it('returns 400 if fields missing', async () => {
      const res = await request(app)
        .post('/auth/login')
        .send({ email: 'auth@example.com' });
      expect(res.status).toBe(400);
    });
  });

  describe('auth.logout', () => {
    it('invalidates session token after logout', async () => {
      const loginRes = await request(app)
        .post('/auth/login')
        .send({ email: 'auth@example.com', password: 'password123' });

      const { token, userId } = loginRes.body;

      await request(app)
        .post('/auth/logout')
        .set('Authorization', `Bearer ${token}`)
        .expect(204);

      // Token should no longer work
      const res = await request(app)
        .get(`/users/${userId}`)
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(401);
    });

    it('returns 401 without token', async () => {
      const res = await request(app).post('/auth/logout');
      expect(res.status).toBe(401);
    });
  });

  describe('INV-003: auth protection', () => {
    it('GET /users/:id requires auth', async () => {
      expect((await request(app).get('/users/id')).status).toBe(401);
    });

    it('PUT /users/:id requires auth', async () => {
      expect((await request(app).put('/users/id').send({})).status).toBe(401);
    });

    it('DELETE /users/:id requires auth', async () => {
      expect((await request(app).delete('/users/id')).status).toBe(401);
    });

    it('POST /auth/logout requires auth', async () => {
      expect((await request(app).post('/auth/logout')).status).toBe(401);
    });

    it('POST /users does NOT require auth (registration)', async () => {
      const res = await request(app)
        .post('/users')
        .send({ name: 'New', email: 'new@example.com', password: 'pass123' });
      expect(res.status).toBe(201);
    });
  });
});
