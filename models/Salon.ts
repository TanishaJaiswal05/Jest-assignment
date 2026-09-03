import mongoose, { Document, Schema } from 'mongoose';

export interface ISalon extends Document {
  name: string;
  location: string;
  openTime: string;
  closeTime: string;
}

const salonSchema = new Schema<ISalon>({
  name: { type: String, required: true },
  location: { type: String, required: true },
  openTime: { type: String, required: true }, // e.g., "09:00"
  closeTime: { type: String, required: true } // e.g., "18:00"
}, { timestamps: true });

export default mongoose.model<ISalon>('Salon', salonSchema);
