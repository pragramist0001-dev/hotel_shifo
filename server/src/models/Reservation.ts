import mongoose, { Schema, Document } from 'mongoose';

export interface IReservation extends Document {
  _id: mongoose.Types.ObjectId;
  room: mongoose.Types.ObjectId;
  guestName: string;
  guestPhone: string;
  numberOfGuests: number;
  checkInDate: Date;
  checkOutDate: Date;
  numberOfNights: number;
  notes?: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'checked_in';
  byReceptionist: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ReservationSchema = new Schema<IReservation>(
  {
    room: { type: Schema.Types.ObjectId, ref: 'Room', required: true },
    guestName: { type: String, required: true, trim: true },
    guestPhone: { type: String, required: true, trim: true },
    numberOfGuests: { type: Number, required: true, min: 1 },
    checkInDate: { type: Date, required: true },
    checkOutDate: { type: Date, required: true },
    numberOfNights: { type: Number, required: true, min: 1 },
    notes: { type: String, trim: true },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'cancelled', 'checked_in'],
      default: 'pending',
    },
    byReceptionist: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

ReservationSchema.index({ status: 1 });
ReservationSchema.index({ checkInDate: 1 });
ReservationSchema.index({ room: 1 });

export default mongoose.model<IReservation>('Reservation', ReservationSchema);
