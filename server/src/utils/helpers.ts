import ActivityLog from '../models/ActivityLog';
import mongoose from 'mongoose';

export const logActivity = async (
  userId: mongoose.Types.ObjectId | string,
  action: string,
  details: string,
  targetType: 'room' | 'booking' | 'transaction' | 'user',
  targetId?: mongoose.Types.ObjectId | string
): Promise<void> => {
  try {
    await ActivityLog.create({
      user: userId,
      action,
      details,
      targetType,
      targetId: targetId || undefined,
      timestamp: new Date(),
    });
  } catch (error) {
    console.error('Activity log xatosi:', error);
  }
};
