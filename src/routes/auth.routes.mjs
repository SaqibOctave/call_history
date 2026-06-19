import { Router } from 'express';
import { login, logout, logoutAll, refresh } from '../controllers/auth.controller.mjs';
import { authenticate } from '../middlewares/auth.middleware.mjs';

const router = Router();

router.post('/login',       login);
router.post('/refresh',     refresh);
router.post('/logout',      logout);
router.post('/logout-all',  authenticate, logoutAll);

export default router;
