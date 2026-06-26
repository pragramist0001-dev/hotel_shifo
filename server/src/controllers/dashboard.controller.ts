import { Response } from 'express';
import Room from '../models/Room';
import Booking from '../models/Booking';
import Transaction from '../models/Transaction';
import { AuthRequest } from '../middleware/auth.middleware';

export const getDashboardStats = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { startDate, endDate } = req.query;
    let start = new Date();
    start.setHours(0, 0, 0, 0);
    let end = new Date(start);
    end.setDate(end.getDate() + 1);

    if (startDate && typeof startDate === 'string') {
      start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
    }
    if (endDate && typeof endDate === 'string') {
      end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
    }

    // Xonalar statistikasi
    const totalRooms = await Room.countDocuments();
    const availableRooms = await Room.countDocuments({ status: 'available' });
    const bookedRooms = await Room.countDocuments({ status: 'booked' });
    const cleaningRooms = await Room.countDocuments({ status: 'cleaning' });
    const maintenanceRooms = await Room.countDocuments({ status: 'maintenance' });

    // Belgilangan davrdagi bookinglar
    const todayCheckIns = await Booking.countDocuments({
      checkInDate: { $gte: start, $lte: end },
    });

    // Belgilangan davrda kutilayotgan check-outlar
    const todayExpectedCheckOuts = await Booking.countDocuments({
      checkOutDate: { $gte: start, $lte: end },
      status: 'active',
    });

    // Davrdagi daromad
    const todayIncome = await Transaction.aggregate([
      {
        $match: {
          type: 'income',
          date: { $gte: start, $lte: end },
        },
      },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);

    // Davrdagi chiqim
    const todayExpense = await Transaction.aggregate([
      {
        $match: {
          type: 'expense',
          date: { $gte: start, $lte: end },
        },
      },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);

    // Faol bookinglar soni
    const activeBookings = await Booking.countDocuments({ status: 'active' });

    res.json({
      rooms: {
        total: totalRooms,
        available: availableRooms,
        booked: bookedRooms,
        cleaning: cleaningRooms,
        maintenance: maintenanceRooms,
        occupancyRate: totalRooms > 0 ? Math.round((bookedRooms / totalRooms) * 100) : 0,
      },
      today: {
        checkIns: todayCheckIns,
        expectedCheckOuts: todayExpectedCheckOuts,
        income: todayIncome[0]?.total || 0,
        expense: todayExpense[0]?.total || 0,
      },
      activeBookings,
    });
  } catch (error) {
    console.error('Dashboard stats xatosi:', error);
    res.status(500).json({ message: 'Server xatosi.' });
  }
};

export const getRevenueChart = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { period = '7days', startDate, endDate } = req.query;
    let start = new Date();
    let end = new Date();

    if (startDate && endDate && typeof startDate === 'string' && typeof endDate === 'string') {
      start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
    } else {
      switch (period) {
        case '7days':
          start.setDate(start.getDate() - 7);
          break;
        case '30days':
          start.setDate(start.getDate() - 30);
          break;
        case '90days':
          start.setDate(start.getDate() - 90);
          break;
        default:
          start.setDate(start.getDate() - 7);
      }
    }

    const revenueData = await Transaction.aggregate([
      { $match: { date: { $gte: start, $lte: end } } },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
            type: '$type',
          },
          total: { $sum: '$amount' },
        },
      },
      { $sort: { '_id.date': 1 } },
    ]);

    // Kunlik data formatlash
    const chartData: any[] = [];
    const dateMap = new Map<string, { date: string; income: number; expense: number }>();

    revenueData.forEach((item) => {
      const key = item._id.date;
      if (!dateMap.has(key)) {
        dateMap.set(key, { date: key, income: 0, expense: 0 });
      }
      const entry = dateMap.get(key)!;
      if (item._id.type === 'income') entry.income = item.total;
      else entry.expense = item.total;
    });

    dateMap.forEach((value) => chartData.push(value));
    chartData.sort((a, b) => a.date.localeCompare(b.date));

    res.json({ chartData });
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi.' });
  }
};

export const getOccupancyChart = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const roomsByType = await Room.aggregate([
      {
        $group: {
          _id: { type: '$type', status: '$status' },
          count: { $sum: 1 },
        },
      },
    ]);

    const typeStats = new Map<string, { type: string; total: number; booked: number }>();

    roomsByType.forEach((item) => {
      const type = item._id.type;
      if (!typeStats.has(type)) {
        typeStats.set(type, { type, total: 0, booked: 0 });
      }
      const entry = typeStats.get(type)!;
      entry.total += item.count;
      if (item._id.status === 'booked') entry.booked += item.count;
    });

    const occupancyData: any[] = [];
    typeStats.forEach((value) => occupancyData.push(value));

    res.json({ occupancyData });
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi.' });
  }
};
