import { Router } from 'express';
import {
  createRegistration,
  joinWaitlist,
  cancelRegistration,
  markAttendance,
  getRegistrations,
  getStudentRegistrations,
  getEventRegistrations,
} from '../controllers/registrationController';
import { requireRole } from '../middleware/authMiddleware';

const router: Router = Router();

// POST /api/registrations - Register a student for an event (Student role required)
// GET /api/registrations - List registrations
router.route('/')
  .post(requireRole(['student']), createRegistration)
  .get(getRegistrations);

// POST /api/registrations/waitlist - Join waitlist for a full event (Student role required)
router.post('/waitlist', requireRole(['student']), joinWaitlist);

// DELETE /api/registrations/:id - Cancel registration (triggers auto-promotion & socket update)
router.route('/:id')
  .delete(cancelRegistration);

// PATCH /api/registrations/:id/cancel - Soft-cancel registration (triggers auto-promotion & socket update)
router.route('/:id/cancel')
  .patch(cancelRegistration);

// PATCH /api/registrations/:id/attend - Mark attendance (Organizer role required)
router.route('/:id/attend')
  .patch(requireRole(['organizer']), markAttendance);

// GET /api/registrations/event/:eventId (convenience direct route)
router.route('/event/:eventId')
  .get(getEventRegistrations);

// GET /api/registrations/student/:studentId (convenience direct route)
router.route('/student/:studentId')
  .get(getStudentRegistrations);

export default router;
