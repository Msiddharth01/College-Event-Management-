import { Router } from 'express';
import { register, registerOrganizer, login, getMe } from '../controllers/authController';
import { protect } from '../middleware/auth';

const router: Router = Router();

router.post('/register', register);
router.post('/register-organizer', registerOrganizer);
router.post('/login', login);
router.get('/me', protect, getMe);

export default router;

