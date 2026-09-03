import mongoose, { Document, Schema } from 'mongoose';

export interface IBooking extends Document {
  salonId: mongoose.Types.ObjectId;
  stylistId: mongoose.Types.ObjectId;
  customerId: mongoose.Types.ObjectId;
  serviceId: mongoose.Types.ObjectId;
  date: string;
  startTime: string;
  endTime: string;
  status: 'booked' | 'cancelled' | 'completed';
}

const bookingSchema = new Schema<IBooking>({
  salonId: { type: Schema.Types.ObjectId, ref: 'Salon', required: true },
  stylistId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  customerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  serviceId: { type: Schema.Types.ObjectId, ref: 'Service', required: true },
  date: { type: String, required: true }, // Format: "YYYY-MM-DD"
  startTime: { type: String, required: true }, // Format: "HH:mm"
  endTime: { type: String, required: true }, // Format: "HH:mm"
  status: { type: String, enum: ['booked', 'cancelled', 'completed'], default: 'booked' }
}, { timestamps: true });

export default mongoose.model<IBooking>('Booking', bookingSchema);
