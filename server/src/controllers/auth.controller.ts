import { Response } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import { AuthRequest } from '../middleware/auth.middleware';
import { logActivity } from '../utils/helpers';

const generateTokens = (userId: string) => {
  const accessToken = jwt.sign(
    { userId },
    process.env.JWT_SECRET || 'secret',
    { expiresIn: (process.env.JWT_EXPIRES_IN || '1d') as any }
  );
  const refreshToken = jwt.sign(
    { userId },
    process.env.JWT_REFRESH_SECRET || 'refresh_secret',
    { expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN || '7d') as any }
  );
  return { accessToken, refreshToken };
};

export const login = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      res.status(400).json({ message: 'Username va parol majburiy.' });
      return;
    }

    const user = await User.findOne({ username: username.toLowerCase() });
    if (!user) {
      res.status(401).json({ message: 'Username yoki parol noto\'g\'ri.' });
      return;
    }

    if (!user.isActive) {
      res.status(403).json({ message: 'Sizning akkauntingiz nofaol. Admin bilan bog\'laning.' });
      return;
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      res.status(401).json({ message: 'Username yoki parol noto\'g\'ri.' });
      return;
    }

    const tokens = generateTokens(user._id.toString());

    await logActivity(user._id, 'login', `${user.fullName} tizimga kirdi`, 'user', user._id);

    res.json({
      message: 'Muvaffaqiyatli kirish!',
      user: {
        _id: user._id,
        fullName: user.fullName,
        username: user.username,
        role: user.role,
        phone: user.phone,
      },
      ...tokens,
    });
  } catch (error) {
    console.error('Login xatosi:', error);
    res.status(500).json({ message: 'Server xatosi.' });
  }
};

export const refreshToken = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      res.status(400).json({ message: 'Refresh token majburiy.' });
      return;
    }

    const decoded = jwt.verify(
      refreshToken,
      process.env.JWT_REFRESH_SECRET || 'refresh_secret'
    ) as { userId: string };

    const user = await User.findById(decoded.userId);
    if (!user || !user.isActive) {
      res.status(401).json({ message: 'Token yaroqsiz.' });
      return;
    }

    const tokens = generateTokens(user._id.toString());
    res.json(tokens);
  } catch (error) {
    res.status(401).json({ message: 'Refresh token yaroqsiz yoki muddati tugagan.' });
  }
};

export const getMe = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Autentifikatsiya talab qilinadi.' });
      return;
    }
    res.json({ user: req.user });
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi.' });
  }
};

export const updateProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      res.status(401).json({ message: 'Autentifikatsiya talab qilinadi.' });
      return;
    }

    const { fullName, username, phone, password } = req.body;
    const user = await User.findById(userId);

    if (!user) {
      res.status(404).json({ message: 'Foydalanuvchi topilmadi.' });
      return;
    }

    if (username && username !== user.username) {
      const existingUser = await User.findOne({ username: username.toLowerCase() });
      if (existingUser) {
        res.status(400).json({ message: 'Bu login allaqachon band.' });
        return;
      }
      user.username = username.toLowerCase();
    }

    if (fullName) user.fullName = fullName;
    if (phone !== undefined) user.phone = phone;
    
    if (password) {
      user.password = password; // pre-save hook xeshlaydi
    }

    await user.save();
    await logActivity(user._id, 'update_profile', 'Profil ma\'lumotlarini yangiladi', 'user', user._id);

    res.json({
      message: 'Profil muvaffaqiyatli yangilandi.',
      user: {
        _id: user._id,
        fullName: user.fullName,
        username: user.username,
        role: user.role,
        phone: user.phone,
      }
    });
  } catch (error) {
    console.error('Update profile xatosi:', error);
    res.status(500).json({ message: 'Server xatosi.' });
  }
};
