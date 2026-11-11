import { Router } from 'express';
import {
  submitFeedback,
  getEventFeedback,
  getStudentFeedback,
} from '../controllers/feedbackController';
import { requireRole } from '../middleware/authMiddleware';

const router: Router = Router();

// POST /api/feedback - Submit rating & comment (Student role required)
router.post('/', requireRole(['student']), submitFeedback);

// GET /api/feedback/event/:eventId - Get all feedback reviews for an event
router.get('/event/:eventId', getEventFeedback);

// GET /api/feedback/student/:studentId - Get all feedback submitted by a student
router.get('/student/:studentId', getStudentFeedback);

export default router;

