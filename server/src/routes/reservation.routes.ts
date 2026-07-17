import { Router } from 'express';
import { getAllReservations, createReservation, confirmReservation, cancelReservation, deleteReservation } from '../controllers/reservation.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();
router.use(authenticate);

router.get('/', getAllReservations);
router.post('/', createReservation);
router.post('/:id/confirm', confirmReservation);
router.post('/:id/cancel', cancelReservation);
router.delete('/:id', deleteReservation);

export default router;
