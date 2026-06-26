import { Response } from 'express';
import Report from '../models/Report';
import Transaction from '../models/Transaction';
import Booking from '../models/Booking';
import { AuthRequest } from '../middleware/auth.middleware';
import User from '../models/User';

export const createReport = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { type, content } = req.body;
    
    if (!type || !content) {
      res.status(400).json({ message: 'Hisobot turi va matni majburiy.' });
      return;
    }

    const start = new Date();
    const end = new Date();
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    if (type === 'weekly') {
      const day = start.getDay();
      const diff = start.getDate() - day + (day === 0 ? -6 : 1);
      start.setDate(diff);
    } else if (type === 'monthly') {
      start.setDate(1);
    }

    const transactions = await Transaction.find({
      createdBy: req.user!._id,
      type: 'income',
      date: { $gte: start, $lte: end }
    });
    const totalIncome = transactions.reduce((sum, t) => sum + t.amount, 0);

    const bookings = await Booking.find({
      byReceptionist: req.user!._id,
      createdAt: { $gte: start, $lte: end }
    });
    
    let totalGuests = 0;
    bookings.forEach(b => {
      totalGuests += 1;
      if (b.guestDetails.spouseDetails?.fullName) totalGuests += 1;
      if (b.guestDetails.familyMembers) totalGuests += b.guestDetails.familyMembers.length;
    });

    const report = await Report.create({
      author: req.user!._id,
      type,
      content,
      status: 'submitted',
      stats: { totalGuests, totalIncome }
    });

    const populatedReport = await Report.findById(report._id).populate('author', 'fullName username role');

    const io = req.app.get('io');
    if (io) {
      io.emit('report:new', { type: 'create' });
      io.emit('dashboard:update', { type: 'newReport' });
    }

    res.status(201).json({ message: 'Hisobot muvaffaqiyatli jo\'natildi!', report: populatedReport });
  } catch (error) {
    console.error('Hisobot yaratish xatosi:', error);
    res.status(500).json({ message: 'Server xatosi' });
  }
};

export const getReportStats = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { type } = req.query;
    
    if (!type) {
      res.status(400).json({ message: 'Hisobot turi majburiy.' });
      return;
    }

    const start = new Date();
    const end = new Date();
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    if (type === 'weekly') {
      const day = start.getDay();
      const diff = start.getDate() - day + (day === 0 ? -6 : 1);
      start.setDate(diff);
    } else if (type === 'monthly') {
      start.setDate(1);
    }

    const transactions = await Transaction.find({
      createdBy: req.user!._id,
      type: 'income',
      date: { $gte: start, $lte: end }
    });
    const totalIncome = transactions.reduce((sum, t) => sum + t.amount, 0);

    const bookings = await Booking.find({
      byReceptionist: req.user!._id,
      createdAt: { $gte: start, $lte: end }
    });
    
    let totalGuests = 0;
    bookings.forEach(b => {
      totalGuests += 1;
      if (b.guestDetails.spouseDetails?.fullName) totalGuests += 1;
      if (b.guestDetails.familyMembers) totalGuests += b.guestDetails.familyMembers.length;
    });

    res.json({ stats: { totalGuests, totalIncome } });
  } catch (error) {
    console.error('Statistika olish xatosi:', error);
    res.status(500).json({ message: 'Server xatosi' });
  }
};

export const getReports = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { type, status, author } = req.query;
    const filter: any = {};
    
    if (type) filter.type = type;
    if (status) filter.status = status;
    if (author) filter.author = author;

    // Agar foydalanuvchi oddiy xodim bo'lsa, faqat o'zining hisobotlarini ko'radi
    if (req.user!.role !== 'admin') {
      filter.author = req.user!._id;
    }

    const reports = await Report.find(filter)
      .populate('author', 'fullName username role')
      .populate('reviewedBy', 'fullName username')
      .sort({ createdAt: -1 });

    res.json({ reports });
  } catch (error) {
    console.error('Hisobotlarni olish xatosi:', error);
    res.status(500).json({ message: 'Server xatosi' });
  }
};

export const updateReportStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (req.user!.role !== 'admin') {
      res.status(403).json({ message: 'Sizga ruxsat yo\'q.' });
      return;
    }

    const { id } = req.params;
    const report = await Report.findById(id);

    if (!report) {
      res.status(404).json({ message: 'Hisobot topilmadi.' });
      return;
    }

    report.status = 'reviewed';
    report.reviewedBy = req.user!._id;
    await report.save();

    const populatedReport = await Report.findById(id)
      .populate('author', 'fullName username role')
      .populate('reviewedBy', 'fullName username');

    // Socket orqali xodimga xabar berish
    const io = req.app.get('io');
    if (io) {
      io.emit('report:new', { type: 'reviewed' });
      io.emit('dashboard:update', { type: 'reportStatusUpdated', reportId: id });
    }

    res.json({ message: 'Hisobot tasdiqlandi.', report: populatedReport });
  } catch (error) {
    console.error('Hisobot yangilash xatosi:', error);
    res.status(500).json({ message: 'Server xatosi' });
  }
};

export const updateReport = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { type, content } = req.body;

    const report = await Report.findById(id);
    if (!report) {
      res.status(404).json({ message: 'Hisobot topilmadi.' });
      return;
    }

    if (report.status === 'reviewed' && req.user!.role !== 'admin') {
      res.status(400).json({ message: 'Tasdiqlangan hisobotni tahrirlash mumkin emas.' });
      return;
    }

    if (req.user!.role !== 'admin' && report.author.toString() !== req.user!._id.toString()) {
      res.status(403).json({ message: 'Bunga ruxsat yo\'q.' });
      return;
    }

    report.type = type || report.type;
    report.content = content || report.content;

    if (type) {
      const start = new Date();
      const end = new Date();
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);

      if (type === 'weekly') {
        const day = start.getDay();
        const diff = start.getDate() - day + (day === 0 ? -6 : 1);
        start.setDate(diff);
      } else if (type === 'monthly') {
        start.setDate(1);
      }

      const transactions = await Transaction.find({
        createdBy: report.author,
        type: 'income',
        date: { $gte: start, $lte: end }
      });
      const totalIncome = transactions.reduce((sum, t) => sum + t.amount, 0);

      const bookings = await Booking.find({
        byReceptionist: report.author,
        createdAt: { $gte: start, $lte: end }
      });
      
      let totalGuests = 0;
      bookings.forEach(b => {
        totalGuests += 1;
        if (b.guestDetails.spouseDetails?.fullName) totalGuests += 1;
        if (b.guestDetails.familyMembers) totalGuests += b.guestDetails.familyMembers.length;
      });

      report.stats = { totalGuests, totalIncome };
    }

    await report.save();
    
    const populatedReport = await Report.findById(id).populate('author', 'fullName username role');

    const io = req.app.get('io');
    if (io) io.emit('report:new', { type: 'update' });

    res.json({ message: 'Hisobot tahrirlandi.', report: populatedReport });
  } catch (error) {
    console.error('Hisobot tahrirlash xatosi:', error);
    res.status(500).json({ message: 'Server xatosi' });
  }
};

export const deleteReport = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const report = await Report.findById(id);

    if (!report) {
      res.status(404).json({ message: 'Hisobot topilmadi.' });
      return;
    }

    if (req.user!.role !== 'admin') {
      if (report.author.toString() !== req.user!._id.toString()) {
        res.status(403).json({ message: 'Bunga ruxsat yo\'q.' });
        return;
      }
      if (report.status === 'reviewed') {
        res.status(400).json({ message: 'Tasdiqlangan hisobotni o\'chirish mumkin emas.' });
        return;
      }
    }

    await Report.findByIdAndDelete(id);

    const io = req.app.get('io');
    if (io) {
      io.emit('report:new', { type: 'delete' });
      io.emit('dashboard:update', { type: 'reportDelete' });
    }

    res.json({ message: 'Hisobot o\'chirildi.' });
  } catch (error) {
    console.error('Hisobot o\'chirish xatosi:', error);
    res.status(500).json({ message: 'Server xatosi' });
  }
};
