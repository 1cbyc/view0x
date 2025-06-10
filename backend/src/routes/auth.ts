import express from 'express';
import { login, register, requestPasswordReset, resetPassword, getCurrentUser } from '../controllers/auth';

const router = express.Router();

// Auth routes
router.post('/login', login);
router.post('/register', register);
router.post('/forgot-password', requestPasswordReset);
router.post('/reset-password', resetPassword);
router.get('/me', getCurrentUser);

export default router; 