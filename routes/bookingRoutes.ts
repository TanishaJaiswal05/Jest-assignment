import express from 'express';
import { createBooking, cancelBooking } from '../controllers/bookingController';
import { authMiddleware } from '../middleware/auth';

const router = express.Router();

router.post('/bookings', authMiddleware, createBooking);
router.post('/bookings/:bookingId/cancel', authMiddleware, cancelBooking);

export default router;
