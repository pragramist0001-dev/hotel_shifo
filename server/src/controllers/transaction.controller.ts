import { Response } from 'express';
import Transaction from '../models/Transaction';
import { AuthRequest } from '../middleware/auth.middleware';
import { logActivity } from '../utils/helpers';

export const getAllTransactions = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { type, category, startDate, endDate, page = 1, limit = 30 } = req.query;
    const filter: any = {};

    if (type) filter.type = type;
    if (category) filter.category = category;

    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate as string);
      if (endDate) {
        const end = new Date(endDate as string);
        end.setHours(23, 59, 59, 999);
        filter.date.$lte = end;
      }
    }

    const skip = (Number(page) - 1) * Number(limit);
    const transactions = await Transaction.find(filter)
      .populate('createdBy', 'fullName')
      .populate('relatedBooking', 'guestDetails.fullName')
      .sort({ date: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await Transaction.countDocuments(filter);

    res.json({ transactions, total, page: Number(page), totalPages: Math.ceil(total / Number(limit)) });
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi.' });
  }
};

export const createTransaction = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { type, category, amount, description, paymentMethod, date } = req.body;

    if (!type || !category || !amount || !description) {
      res.status(400).json({ message: 'Tur, kategoriya, summa va tavsif majburiy.' });
      return;
    }

    const transaction = await Transaction.create({
      type,
      category,
      amount,
      description,
      paymentMethod,
      createdBy: req.user!._id,
      date: date || new Date(),
    });

    await logActivity(
      req.user!._id,
      `transaction_${type}`,
      `${type === 'income' ? 'Kirim' : 'Chiqim'}: ${description} - ${amount.toLocaleString()} so'm`,
      'transaction',
      transaction._id
    );

    const io = req.app.get('io');
    if (io) {
      io.emit('transaction:new', transaction);
      io.emit('dashboard:update', { type: 'transaction' });
    }

    res.status(201).json({ message: 'Tranzaksiya yaratildi.', transaction });
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi.' });
  }
};

export const getTransactionSummary = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { startDate, endDate } = req.query;

    const dateFilter: any = {};
    if (startDate) dateFilter.$gte = new Date(startDate as string);
    if (endDate) {
      const end = new Date(endDate as string);
      end.setHours(23, 59, 59, 999);
      dateFilter.$lte = end;
    }

    const matchStage: any = {};
    if (Object.keys(dateFilter).length > 0) matchStage.date = dateFilter;

    const summary = await Transaction.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$type',
          total: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
    ]);

    const income = summary.find((s) => s._id === 'income') || { total: 0, count: 0 };
    const expense = summary.find((s) => s._id === 'expense') || { total: 0, count: 0 };

    // Kategoriya bo'yicha taqsimot
    const categoryBreakdown = await Transaction.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: { type: '$type', category: '$category' },
          total: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.type': 1, total: -1 } },
    ]);

    res.json({
      income: { total: income.total, count: income.count },
      expense: { total: expense.total, count: expense.count },
      balance: income.total - expense.total,
      categoryBreakdown,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi.' });
  }
};

export const deleteTransaction = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const transaction = await Transaction.findById(req.params.id);
    if (!transaction) {
      res.status(404).json({ message: 'Tranzaksiya topilmadi.' });
      return;
    }

    await Transaction.findByIdAndDelete(req.params.id);

    await logActivity(
      req.user!._id,
      'transaction_delete',
      `Tranzaksiya o'chirildi: ${transaction.description}`,
      'transaction',
      transaction._id
    );

    const io = req.app.get('io');
    if (io) {
      io.emit('transaction:new', { action: 'delete' });
      io.emit('dashboard:update', { type: 'transactionDelete' });
    }

    res.json({ message: 'Tranzaksiya o\'chirildi.' });
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi.' });
  }
};

export const updateTransaction = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { type, category, amount, description, paymentMethod, date } = req.body;

    const transaction = await Transaction.findById(id);
    if (!transaction) {
      res.status(404).json({ message: 'Tranzaksiya topilmadi.' });
      return;
    }

    transaction.type = type || transaction.type;
    transaction.category = category || transaction.category;
    transaction.amount = amount !== undefined ? amount : transaction.amount;
    transaction.description = description || transaction.description;
    transaction.paymentMethod = paymentMethod || transaction.paymentMethod;
    if (date) transaction.date = date;

    await transaction.save();

    await logActivity(
      req.user!._id,
      'transaction_update',
      `Tranzaksiya tahrirlandi: ${transaction.description} - ${transaction.amount.toLocaleString()} so'm`,
      'transaction',
      transaction._id
    );

    const io = req.app.get('io');
    if (io) {
      io.emit('transaction:update', transaction);
      io.emit('dashboard:update', { type: 'transaction' });
    }

    res.json({ message: 'Tranzaksiya tahrirlandi.', transaction });
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi.' });
  }
};
