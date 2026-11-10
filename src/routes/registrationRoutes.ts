import { Router } from 'express';
import {
  createRegistration,
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

// PATCH /api/registrations/:id/cancel - Soft-cancel registration
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
