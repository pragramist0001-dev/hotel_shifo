import { Router } from 'express';
import { checkIn, checkOut, getAllBookings, getActiveBookings, getBookingById, addPayment, deletePayment, updateBooking, deleteBooking, freezeBooking, resumeBooking, removeFamilyMember, removeSpouse, removeMainGuest, getClientBookings } from '../controllers/booking.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/', getAllBookings);
router.get('/active', getActiveBookings);
router.get('/client/:phone', getClientBookings);
router.get('/:id', getBookingById);
router.post('/check-in', checkIn);
router.post('/:id/check-out', checkOut);
router.post('/:id/payment', addPayment);
router.delete('/payment/:transactionId', deletePayment);
router.post('/:id/freeze', freezeBooking);
router.post('/:id/resume', resumeBooking);
router.post('/:id/remove-family', removeFamilyMember);
router.post('/:id/remove-spouse', removeSpouse);
router.post('/:id/remove-main-guest', removeMainGuest);
router.put('/:id', updateBooking);
router.delete('/:id', deleteBooking);

export default router;
