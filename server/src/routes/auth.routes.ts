import { Router } from 'express';
import { login, refreshToken, getMe, updateProfile } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.post('/login', login);
router.post('/refresh', refreshToken);
router.get('/me', authenticate, getMe);
router.put('/profile', authenticate, updateProfile);

export default router;
