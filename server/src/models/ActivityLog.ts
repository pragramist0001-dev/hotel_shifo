import mongoose, { Schema, Document } from 'mongoose';

export interface IActivityLog extends Document {
  _id: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  action: string;
  details: string;
  targetType: 'room' | 'booking' | 'transaction' | 'user';
  targetId?: mongoose.Types.ObjectId;
  timestamp: Date;
}

const ActivityLogSchema = new Schema<IActivityLog>({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  action: { type: String, required: true, trim: true },
  details: { type: String, required: true, trim: true },
  targetType: {
    type: String,
    enum: ['room', 'booking', 'transaction', 'user'],
    required: true,
  },
  targetId: { type: Schema.Types.ObjectId },
  timestamp: { type: Date, default: Date.now },
});

ActivityLogSchema.index({ user: 1 });
ActivityLogSchema.index({ timestamp: -1 });
ActivityLogSchema.index({ action: 1 });

export default mongoose.model<IActivityLog>('ActivityLog', ActivityLogSchema);
