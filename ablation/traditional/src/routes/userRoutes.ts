import { Router } from 'express';
import { createUser, getUserById, updateUser, deleteUser } from '../controllers/userController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

// POST /users - create user (no auth required - registration)
router.post('/', createUser);

// GET /users/:id - get user by id (auth required)
router.get('/:id', authMiddleware, getUserById);

// PUT /users/:id - update user (auth required)
router.put('/:id', authMiddleware, updateUser);

// DELETE /users/:id - delete user (auth required)
router.delete('/:id', authMiddleware, deleteUser);

export default router;
