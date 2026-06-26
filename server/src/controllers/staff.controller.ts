import { Response } from 'express';
import User from '../models/User';
import ActivityLog from '../models/ActivityLog';
import { AuthRequest } from '../middleware/auth.middleware';
import { logActivity } from '../utils/helpers';

export const getAllStaff = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const staff = await User.find({ role: 'reception' })
      .select('-password')
      .sort({ createdAt: -1 });

    // Har bir xodimning oxirgi faolligini olish
    const staffWithActivity = await Promise.all(
      staff.map(async (member) => {
        const lastActivity = await ActivityLog.findOne({ user: member._id })
          .sort({ timestamp: -1 })
          .select('action timestamp');

        const activityCount = await ActivityLog.countDocuments({
          user: member._id,
          action: { $in: ['check_in', 'check_out'] },
        });

        return {
          ...member.toJSON(),
          lastActivity: lastActivity?.timestamp || null,
          totalActions: activityCount,
        };
      })
    );

    res.json({ staff: staffWithActivity });
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi.' });
  }
};

export const createStaff = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { fullName, username, password, phone } = req.body;

    if (!fullName || !username || !password) {
      res.status(400).json({ message: 'Ism, username va parol majburiy.' });
      return;
    }

    const existingUser = await User.findOne({ username: username.toLowerCase() });
    if (existingUser) {
      res.status(400).json({ message: 'Bu username allaqachon band.' });
      return;
    }

    const user = await User.create({
      fullName,
      username: username.toLowerCase(),
      password,
      role: 'reception',
      phone,
    });

    await logActivity(
      req.user!._id,
      'staff_create',
      `Yangi xodim qo'shildi: ${fullName}`,
      'user',
      user._id
    );

    const io = req.app.get('io');
    if (io) io.emit('staff:update', { action: 'create' });

    res.status(201).json({
      message: 'Xodim muvaffaqiyatli qo\'shildi.',
      staff: {
        _id: user._id,
        fullName: user.fullName,
        username: user.username,
        role: user.role,
        phone: user.phone,
        isActive: user.isActive,
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi.' });
  }
};

export const updateStaff = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { fullName, username, phone, isActive, password } = req.body;

    const user = await User.findById(req.params.id);
    if (!user || user.role !== 'reception') {
      res.status(404).json({ message: 'Xodim topilmadi.' });
      return;
    }

    // Username o'zgarganda duplicate tekshirish
    if (username && username.toLowerCase() !== user.username) {
      const existing = await User.findOne({ username: username.toLowerCase() });
      if (existing) {
        res.status(400).json({ message: 'Bu username allaqachon band.' });
        return;
      }
      user.username = username.toLowerCase();
    }

    if (fullName) user.fullName = fullName;
    if (phone !== undefined) user.phone = phone;
    if (isActive !== undefined) user.isActive = isActive;
    if (password && password.trim() !== '') user.password = password;

    await user.save();

    await logActivity(
      req.user!._id,
      'staff_update',
      `Xodim yangilandi: ${user.fullName}`,
      'user',
      user._id
    );

    const io = req.app.get('io');
    if (io) io.emit('staff:update', { action: 'update' });

    res.json({ message: 'Xodim yangilandi.', staff: user });
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi.' });
  }
};


export const deleteStaff = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.params.id);
    if (!user || user.role !== 'reception') {
      res.status(404).json({ message: 'Xodim topilmadi.' });
      return;
    }

    await User.findByIdAndDelete(req.params.id);

    await logActivity(
      req.user!._id,
      'staff_delete',
      `Xodim o'chirildi: ${user.fullName}`,
      'user',
      user._id
    );

    const io = req.app.get('io');
    if (io) io.emit('staff:update', { action: 'delete' });

    res.json({ message: 'Xodim o\'chirildi.' });
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi.' });
  }
};

export const getStaffLogs = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { page = 1, limit = 30 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const logs = await ActivityLog.find({ user: req.params.id })
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await ActivityLog.countDocuments({ user: req.params.id });

    res.json({ logs, total, page: Number(page), totalPages: Math.ceil(total / Number(limit)) });
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi.' });
  }
};

export const getAllLogs = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { page = 1, limit = 50, action } = req.query;
    const filter: any = {};
    if (action) filter.action = action;

    const skip = (Number(page) - 1) * Number(limit);
    const logs = await ActivityLog.find(filter)
      .populate('user', 'fullName role')
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await ActivityLog.countDocuments(filter);

    res.json({ logs, total, page: Number(page), totalPages: Math.ceil(total / Number(limit)) });
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi.' });
  }
};
