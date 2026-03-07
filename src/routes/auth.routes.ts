import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { authLimiter, strictLimiter } from '../middlewares/rateLimiter';

const router = Router();
const authController = new AuthController();

router.post('/detect-locale', authLimiter, authController.detectLocale);
router.post('/register', authLimiter, authController.register);
router.post('/login', authLimiter, authController.login);
router.post('/refresh', authController.refresh);
router.post('/forgot-password', authLimiter, authController.forgotPassword);
router.post('/reset-password', strictLimiter, authController.resetPassword);

export default router;
