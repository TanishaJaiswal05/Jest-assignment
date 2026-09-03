import { Request, Response } from 'express';
import Booking from '../models/Booking';
import Service from '../models/Service';
import Salon from '../models/Salon';

const timeToMins = (time: string): number => {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
};

const minsToTime = (mins: number): string => {
  const h = Math.floor(mins / 60).toString().padStart(2, '0');
  const m = (mins % 60).toString().padStart(2, '0');
  return `${h}:${m}`;
};

export const createBooking = async (req: Request, res: Response): Promise<void> => {
  try {
    const { salonId, stylistId, serviceId, slotTime, date } = req.body;
    const customerId = req.user._id;

    if (!date) {
      res.status(400).json({ error: 'date is required' });
      return;
    }

    const service = await Service.findById(serviceId);
    if (!service) {
      res.status(404).json({ error: 'Service not found' });
      return;
    }

    const startMins = timeToMins(slotTime);
    const duration = service.duration;
    const endMins = startMins + duration;
    const endTime = minsToTime(endMins);

    const existingBookings = await Booking.find({
      salonId,
      date,
      stylistId,
      status: 'booked'
    });

    const hasConflict = existingBookings.some(b => {
      const bStart = timeToMins(b.startTime);
      const bEnd = timeToMins(b.endTime);
      return startMins < bEnd && endMins > bStart;
    });

    if (hasConflict) {
      res.status(400).json({ error: 'Time slot is no longer available' });
      return;
    }

    const booking = new Booking({
      salonId,
      stylistId,
      customerId,
      serviceId,
      date,
      startTime: slotTime,
      endTime
    });

    await booking.save();
    res.status(201).json({ message: 'Booking created successfully', booking });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const cancelBooking = async (req: Request, res: Response): Promise<void> => {
  try {
    const { bookingId } = req.params;
    const userId = req.user._id;
    const userRole = req.user.role;

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      res.status(404).json({ error: 'Booking not found' });
      return;
    }

    if (booking.customerId.toString() !== userId.toString() && userRole !== 'admin') {
      res.status(403).json({ error: 'Not authorized to cancel this booking' });
      return;
    }

    if (booking.status === 'cancelled') {
      res.status(400).json({ error: 'Booking is already cancelled' });
      return;
    }

    booking.status = 'cancelled';
    await booking.save();

    res.json({ message: 'Booking cancelled successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};
