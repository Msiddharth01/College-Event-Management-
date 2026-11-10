import { Router } from 'express';
import {
  getEvents,
  getEventById,
  createEvent,
  updateEvent,
  cancelEvent,
} from '../controllers/eventController';
import { getEventRegistrations } from '../controllers/registrationController';
import { requireRole } from '../middleware/authMiddleware';

const router: Router = Router();

router.route('/')
  .get(getEvents)
  .post(requireRole(['organizer']), createEvent);

router.route('/:id/cancel')
  .patch(requireRole(['organizer']), cancelEvent);

router.route('/:eventId/registrations')
  .get(getEventRegistrations);

router.route('/:id')
  .get(getEventById)
  .put(updateEvent);

export default router;
