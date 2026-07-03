import mongoose, { Schema, Document } from 'mongoose';

export interface ISpouseDetails {
  historyNumber?: string;
  fullName: string;
  passportImage?: string;
  zaksImage?: string;
}

export interface IFamilyMember {
  historyNumber?: string;
  fullName: string;
  birthYear: number;
  birthDate?: Date;
  gender: 'male' | 'female';
  relationship?: string;
  passportSeries?: string;
}

export interface IGuestDetails {
  historyNumber: string;
  fullName: string;
  phone: string;
  birthYear: number;
  birthDate?: Date;
  gender: 'male' | 'female';
  country: string;
  region?: string;
  passportImage?: string;
  passportSeries?: string;
  maritalStatus: 'single' | 'married';
  spouseDetails?: ISpouseDetails;
  familyMembers?: IFamilyMember[];
}

export interface IAdditionalCharge {
  description: string;
  amount: number;
}

export interface IBooking extends Document {
  _id: mongoose.Types.ObjectId;
  room: mongoose.Types.ObjectId;
  guestDetails: IGuestDetails;
  checkInDate: Date;
  checkOutDate: Date;
  actualCheckOut?: Date;
  numberOfNights: number;
  pricePerPerson?: number;
  negotiatedPrice?: number;
  totalPrice: number;
  paidAmount: number;
  paymentStatus: 'paid' | 'partially_paid' | 'unpaid';
  paymentMethod: 'cash' | 'terminal' | 'click' | 'transfer';
  additionalCharges: IAdditionalCharge[];
  overtimeCharge: number;
  status: 'active' | 'checked_out' | 'cancelled' | 'frozen';
  frozenBalance?: number;
  byReceptionist: mongoose.Types.ObjectId;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const SpouseDetailsSchema = new Schema<ISpouseDetails>({
  historyNumber: { type: String },
  fullName: { type: String, trim: true },
  passportImage: { type: String },
  zaksImage: { type: String },
});

const FamilyMemberSchema = new Schema<IFamilyMember>({
  historyNumber: { type: String },
  fullName: { type: String, required: true },
  birthYear: { type: Number, required: true },
  birthDate: { type: Date },
  gender: { type: String, enum: ['male', 'female'], required: true },
  relationship: { type: String },
  passportSeries: { type: String },
});

const BookingSchema = new Schema<IBooking>(
  {
    room: { type: Schema.Types.ObjectId, ref: 'Room', required: true },
    guestDetails: {
      historyNumber: { type: String },
      fullName: { type: String, required: true, trim: true },
      phone: { type: String, required: true, trim: true },
      birthYear: { type: Number, required: true },
      birthDate: { type: Date },
      gender: { type: String, enum: ['male', 'female'], required: true },
      country: { type: String, required: true, trim: true },
      region: { type: String, trim: true },
      passportImage: { type: String },
      passportSeries: { type: String },
      maritalStatus: { type: String, enum: ['single', 'married'], required: true },
      spouseDetails: SpouseDetailsSchema,
      familyMembers: [FamilyMemberSchema]
    },
    checkInDate: { type: Date, required: true },
    checkOutDate: { type: Date, required: true },
    actualCheckOut: { type: Date },
    numberOfNights: { type: Number, required: true, min: 1 },
    pricePerPerson: { type: Number, min: 0 },
    negotiatedPrice: { type: Number, min: 0 },
    totalPrice: { type: Number, required: true, min: 0 },
    paidAmount: { type: Number, default: 0, min: 0 },
    paymentStatus: {
      type: String,
      enum: ['paid', 'partially_paid', 'unpaid'],
      default: 'unpaid',
    },
    paymentMethod: {
      type: String,
      enum: ['cash', 'terminal', 'click', 'transfer'],
      required: true,
    },
    additionalCharges: [
      {
        description: { type: String, required: true },
        amount: { type: Number, required: true },
      },
    ],
    overtimeCharge: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['active', 'checked_out', 'cancelled', 'frozen'],
      default: 'active',
    },
    frozenBalance: { type: Number, default: 0 },
    byReceptionist: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    notes: { type: String, trim: true },
  },
  { timestamps: true }
);

BookingSchema.index({ status: 1 });
BookingSchema.index({ checkInDate: 1 });
BookingSchema.index({ checkOutDate: 1 });
BookingSchema.index({ 'guestDetails.phone': 1 });

export default mongoose.model<IBooking>('Booking', BookingSchema);
