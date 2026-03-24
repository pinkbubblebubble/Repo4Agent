/**
 * app.ts - Express application entry point
 * Stack: TypeScript, Express.js
 * Test: npm test
 *
 * Route map:
 *   POST   /users          -> user.create.handler (no auth)
 *   GET    /users/:id      -> user.get.handler (auth required - INV-003)
 *   PUT    /users/:id      -> user.update.handler (auth required - INV-003)
 *   DELETE /users/:id      -> user.delete.handler (auth required - INV-003)
 *   POST   /auth/login     -> auth.login.handler
 *   POST   /auth/logout    -> auth.logout.handler (auth required)
 */

import express from 'express';
import { createUserHandler } from './user/user.create.handler';
import { getUserHandler } from './user/user.get.handler';
import { updateUserHandler } from './user/user.update.handler';
import { deleteUserHandler } from './user/user.delete.handler';
import { loginHandler } from './auth/auth.login.handler';
import { logoutHandler } from './auth/auth.logout.handler';
import { authMiddleware } from './auth/auth.middleware';

const app = express();
app.use(express.json());

// User routes
app.post('/users', createUserHandler);
app.get('/users/:id', authMiddleware, getUserHandler);
app.put('/users/:id', authMiddleware, updateUserHandler);
app.delete('/users/:id', authMiddleware, deleteUserHandler);

// Auth routes
app.post('/auth/login', loginHandler);
app.post('/auth/logout', authMiddleware, logoutHandler);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

export default app;

if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}
