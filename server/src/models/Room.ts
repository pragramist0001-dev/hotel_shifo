import mongoose, { Schema, Document } from 'mongoose';

export interface IRoom extends Document {
  _id: mongoose.Types.ObjectId;
  roomNumber: string;
  type: 'ekonom' | 'standartplus' | 'lyuks';
  floor: number;
  capacity: number;
  pricePerNight: number;
  amenities: string[];
  status: 'available' | 'booked' | 'cleaning' | 'maintenance';
  currentBooking?: mongoose.Types.ObjectId; // Kept for backwards compatibility
  currentBookings: mongoose.Types.ObjectId[];
  occupiedBeds: number;
  description?: string;
  imageUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

const RoomSchema = new Schema<IRoom>(
  {
    roomNumber: { type: String, required: true, unique: true, trim: true },
    type: {
      type: String,
      enum: ['ekonom', 'standartplus', 'lyuks'],
      default: 'ekonom',
    },
    floor: { type: Number, required: true, min: 1 },
    capacity: { type: Number, required: true, min: 1, default: 1 },
    pricePerNight: { type: Number, required: true, min: 0 },
    amenities: [{ type: String, trim: true }],
    status: {
      type: String,
      enum: ['available', 'booked', 'cleaning', 'maintenance'],
      default: 'available',
    },
    currentBooking: { type: Schema.Types.ObjectId, ref: 'Booking', default: null },
    currentBookings: [{ type: Schema.Types.ObjectId, ref: 'Booking' }],
    occupiedBeds: { type: Number, default: 0 },
    description: { type: String, trim: true },
    imageUrl: { type: String, default: null },
  },
  { timestamps: true }
);

RoomSchema.index({ status: 1 });
RoomSchema.index({ floor: 1 });
RoomSchema.index({ type: 1 });

export default mongoose.model<IRoom>('Room', RoomSchema);
