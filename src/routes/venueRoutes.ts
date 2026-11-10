import { Router } from 'express';
import {
  getVenues,
  createVenue,
  getVenueById,
  checkVenueAvailability,
} from '../controllers/venueController';

const router: Router = Router();

router.route('/')
  .get(getVenues)
  .post(createVenue);

router.route('/:id')
  .get(getVenueById);

router.route('/:id/availability')
  .get(checkVenueAvailability);

export default router;
