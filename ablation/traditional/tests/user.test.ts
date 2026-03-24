import request from 'supertest';
import app from '../src/app';
import { clearStores } from '../src/utils/db';

describe('User API', () => {
  let authToken: string;
  let userId: string;

  beforeEach(async () => {
    clearStores();

    // Create a test user and login to get token
    const createRes = await request(app)
      .post('/users')
      .send({ name: 'Test User', email: 'test@example.com', password: 'password123' });

    userId = createRes.body.id;

    const loginRes = await request(app)
      .post('/auth/login')
      .send({ email: 'test@example.com', password: 'password123' });

    authToken = loginRes.body.token;
  });

  describe('POST /users - Create User', () => {
    it('should create a user successfully', async () => {
      const res = await request(app)
        .post('/users')
        .send({ name: 'Alice', email: 'alice@example.com', password: 'securepass' });

      expect(res.status).toBe(201);
      expect(res.body.id).toBeDefined();
      expect(res.body.name).toBe('Alice');
      expect(res.body.email).toBe('alice@example.com');
      expect(res.body.passwordHash).toBeUndefined();
      expect(res.body.password).toBeUndefined();
    });

    it('should return 400 if required fields are missing', async () => {
      const res = await request(app)
        .post('/users')
        .send({ name: 'Alice' });

      expect(res.status).toBe(400);
    });

    it('should return 409 if email already in use', async () => {
      const res = await request(app)
        .post('/users')
        .send({ name: 'Duplicate', email: 'test@example.com', password: 'pass123' });

      expect(res.status).toBe(409);
    });

    it('should not return password in response', async () => {
      const res = await request(app)
        .post('/users')
        .send({ name: 'Bob', email: 'bob@example.com', password: 'mypassword' });

      expect(res.body.password).toBeUndefined();
      expect(res.body.passwordHash).toBeUndefined();
    });
  });

  describe('GET /users/:id - Get User', () => {
    it('should return user when authenticated', async () => {
      const res = await request(app)
        .get(`/users/${userId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(userId);
      expect(res.body.name).toBe('Test User');
      expect(res.body.email).toBe('test@example.com');
    });

    it('should return 401 without auth token', async () => {
      const res = await request(app).get(`/users/${userId}`);
      expect(res.status).toBe(401);
    });

    it('should return 404 for non-existent user', async () => {
      const res = await request(app)
        .get('/users/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(404);
    });
  });

  describe('PUT /users/:id - Update User', () => {
    it('should update user when authenticated', async () => {
      const res = await request(app)
        .put(`/users/${userId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Updated Name' });

      expect(res.status).toBe(200);
      expect(res.body.name).toBe('Updated Name');
      expect(res.body.email).toBe('test@example.com');
    });

    it('should return 401 without auth token', async () => {
      const res = await request(app)
        .put(`/users/${userId}`)
        .send({ name: 'Updated' });

      expect(res.status).toBe(401);
    });

    it('should return 404 for non-existent user', async () => {
      const res = await request(app)
        .put('/users/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Updated' });

      expect(res.status).toBe(404);
    });

    it('should not return password in response', async () => {
      const res = await request(app)
        .put(`/users/${userId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Updated Name' });

      expect(res.body.password).toBeUndefined();
      expect(res.body.passwordHash).toBeUndefined();
    });
  });

  describe('DELETE /users/:id - Delete User', () => {
    it('should delete user when authenticated', async () => {
      const res = await request(app)
        .delete(`/users/${userId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(204);

      // Verify user is gone - note: bug INV-002 means session token is still valid
      // but the user record no longer exists, so GET returns 404
      const getRes = await request(app)
        .get(`/users/${userId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(getRes.status).toBe(404); // user gone, but session still valid (known bug INV-002)
    });

    it('should return 401 without auth token', async () => {
      const res = await request(app).delete(`/users/${userId}`);
      expect(res.status).toBe(401);
    });

    it('should return 404 for non-existent user', async () => {
      const res = await request(app)
        .delete('/users/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(404);
    });
  });
});
