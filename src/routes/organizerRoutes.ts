import { Router } from 'express';
import {
  getOrganizers,
  createOrganizer,
  getOrganizerById,
} from '../controllers/organizerController';

const router: Router = Router();

router.route('/')
  .get(getOrganizers)
  .post(createOrganizer);

router.route('/:id')
  .get(getOrganizerById);

export default router;
