import { Router } from 'express';
import {
  getStudents,
  createStudent,
  getStudentById,
  updateStudent,
  getStudentByRollNumber,
} from '../controllers/studentController';
import { getStudentRegistrations } from '../controllers/registrationController';

const router: Router = Router();

router.route('/')
  .get(getStudents)
  .post(createStudent);

router.route('/roll/:rollNumber')
  .get(getStudentByRollNumber);

router.route('/:studentId/registrations')
  .get(getStudentRegistrations);

router.route('/:id')
  .get(getStudentById)
  .put(updateStudent)
  .patch(updateStudent);

export default router;
