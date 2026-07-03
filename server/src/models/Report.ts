import mongoose, { Document, Schema } from 'mongoose';

export interface IReport extends Document {
  author: mongoose.Types.ObjectId;
  type: 'daily' | 'weekly' | 'monthly';
  content: string;
  status: 'submitted' | 'reviewed';
  reviewedBy?: mongoose.Types.ObjectId;
  stats?: {
    totalGuests: number;
    totalBookings: number;
    totalIncome: number;
    cashIncome: number;
    terminalIncome: number;
    clickIncome: number;
    transferIncome: number;
    totalExpense: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

const ReportSchema = new Schema(
  {
    author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['daily', 'weekly', 'monthly'], required: true },
    content: { type: String, required: true },
    status: { type: String, enum: ['submitted', 'reviewed'], default: 'submitted' },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    stats: {
      totalGuests: { type: Number, default: 0 },
      totalBookings: { type: Number, default: 0 },
      totalIncome: { type: Number, default: 0 },
      cashIncome: { type: Number, default: 0 },
      terminalIncome: { type: Number, default: 0 },
      clickIncome: { type: Number, default: 0 },
      transferIncome: { type: Number, default: 0 },
      totalExpense: { type: Number, default: 0 }
    }
  },
  { timestamps: true }
);

export default mongoose.model<IReport>('Report', ReportSchema);
