import { Router } from 'express';
import { login, logout } from '../controllers/authController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

// POST /auth/login - login, returns session token
router.post('/login', login);

// POST /auth/logout - logout (auth required)
router.post('/logout', authMiddleware, logout);

export default router;
