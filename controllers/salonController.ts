import { Request, Response } from 'express';
import Salon from '../models/Salon';
import Service from '../models/Service';
import Booking from '../models/Booking';
import User from '../models/User';

// Helper to convert "HH:mm" to minutes
const timeToMins = (time: string): number => {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
};

// Helper to convert minutes to "HH:mm"
const minsToTime = (mins: number): string => {
  const h = Math.floor(mins / 60).toString().padStart(2, '0');
  const m = (mins % 60).toString().padStart(2, '0');
  return `${h}:${m}`;
};

export const getAvailableSlots = async (req: Request, res: Response): Promise<void> => {
  try {
    const { salonId } = req.params;
    const { date, serviceId } = req.query as { date: string, serviceId: string };

    if (!date || !serviceId) {
      res.status(400).json({ error: 'date and serviceId are required' });
      return;
    }

    const salon = await Salon.findById(salonId);
    const service = await Service.findById(serviceId);

    if (!salon || !service) {
      res.status(404).json({ error: 'Salon or Service not found' });
      return;
    }

    const stylists = await User.find({ role: 'stylist' });
    
    // Fetch all active bookings for this salon and date
    const existingBookings = await Booking.find({
      salonId,
      date,
      status: 'booked'
    });

    const openMins = timeToMins(salon.openTime);
    const closeMins = timeToMins(salon.closeTime);
    const duration = service.duration; // in minutes
    
    const availableSlots = [];

    // Generate slots at 30 min intervals
    for (let currentMins = openMins; currentMins + duration <= closeMins; currentMins += 30) {
      const slotStartTime = minsToTime(currentMins);
      // const slotEndTime = minsToTime(currentMins + duration);

      // Check which stylists are available for this slot
      for (const stylist of stylists) {
        const hasConflict = existingBookings.some(b => {
          if (b.stylistId.toString() !== stylist._id.toString()) return false;
          
          const bStart = timeToMins(b.startTime);
          const bEnd = timeToMins(b.endTime);
          
          return currentMins < bEnd && (currentMins + duration) > bStart;
        });

        if (!hasConflict) {
          availableSlots.push({
            time: slotStartTime,
            stylistId: stylist._id,
            stylistName: stylist.name
          });
        }
      }
    }

    res.json({ date, service: service.name, duration, availableSlots });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};
