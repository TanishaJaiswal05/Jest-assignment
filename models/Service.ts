import mongoose, { Document, Schema } from 'mongoose';

export interface IService extends Document {
  name: string;
  duration: number;
  price: number;
  salonId: mongoose.Types.ObjectId;
}

const serviceSchema = new Schema<IService>({
  name: { type: String, required: true },
  duration: { type: Number, required: true }, // duration in minutes
  price: { type: Number, required: true },
  salonId: { type: Schema.Types.ObjectId, ref: 'Salon', required: true }
}, { timestamps: true });

export default mongoose.model<IService>('Service', serviceSchema);
