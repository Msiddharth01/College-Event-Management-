import { Router } from 'express';
import {
  getEventRegistrationSummary,
  getDashboardMetrics,
} from '../controllers/analyticsController';
import { requireRole } from '../middleware/authMiddleware';

const router: Router = Router();

// Protect all analytics endpoints: Organizer role required
router.use(requireRole(['organizer']));

// GET /api/analytics/events-summary - Aggregated registration summary by event
router.get('/events-summary', getEventRegistrationSummary);

// GET /api/analytics/dashboard - High-level system dashboard counts
router.get('/dashboard', getDashboardMetrics);

export default router;

