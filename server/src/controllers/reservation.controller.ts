import { Response } from 'express';
import Reservation from '../models/Reservation';
import Room from '../models/Room';
import { AuthRequest } from '../middleware/auth.middleware';

// Barcha bronlarni olish
export const getAllReservations = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { status, roomId } = req.query;
    const filter: Record<string, any> = {};
    if (status) filter.status = status;
    if (roomId) filter.room = roomId;

    const reservations = await Reservation.find(filter)
      .populate('room', 'roomNumber type floor capacity pricePerNight')
      .populate('byReceptionist', 'fullName username')
      .sort({ checkInDate: 1 });

    res.json({ reservations });
  } catch (err) {
    res.status(500).json({ message: 'Server xatosi', error: err });
  }
};

// Yangi bron yaratish
export const createReservation = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { roomId, guestName, guestPhone, numberOfGuests, checkInDate, checkOutDate, notes } = req.body;

    if (!roomId || !guestName || !guestPhone || !numberOfGuests || !checkInDate || !checkOutDate) {
      res.status(400).json({ message: "Barcha majburiy maydonlarni to'ldiring." });
      return;
    }

    const room = await Room.findById(roomId);
    if (!room) {
      res.status(404).json({ message: 'Xona topilmadi.' });
      return;
    }

    // Xona mavjudligini tekshirish
    if (room.status !== 'available') {
      res.status(400).json({ message: `Xona ${room.roomNumber} hozirda band (${room.status}).` });
      return;
    }

    // Sig'im tekshirish
    if (numberOfGuests > (room.capacity || 1)) {
      res.status(400).json({ message: `Xona sig'imi ${room.capacity} ta kishi. ${numberOfGuests} ta kishi sig'maydi.` });
      return;
    }

    const parsedIn = new Date(checkInDate);
    const parsedOut = new Date(checkOutDate);
    const diffTime = Math.abs(parsedOut.getTime() - parsedIn.getTime());
    let nights = Math.round(diffTime / (1000 * 60 * 60 * 24));
    if (nights < 1) nights = 1;

    // Ushbu vaqt oralig'ida boshqa bron bormi tekshirish
    const conflict = await Reservation.findOne({
      room: roomId,
      status: { $in: ['pending', 'confirmed'] },
      $or: [
        { checkInDate: { $lt: parsedOut }, checkOutDate: { $gt: parsedIn } },
      ],
    });
    if (conflict) {
      res.status(400).json({ message: `Bu xona ${new Date(conflict.checkInDate).toLocaleDateString('uz-UZ')} — ${new Date(conflict.checkOutDate).toLocaleDateString('uz-UZ')} kunlari allaqachon band qilingan.` });
      return;
    }

    const reservation = await Reservation.create({
      room: roomId,
      guestName,
      guestPhone,
      numberOfGuests,
      checkInDate: parsedIn,
      checkOutDate: parsedOut,
      numberOfNights: nights,
      notes,
      status: 'pending',
      byReceptionist: req.user!._id,
    });

    const populated = await reservation.populate([
      { path: 'room', select: 'roomNumber type floor capacity pricePerNight' },
      { path: 'byReceptionist', select: 'fullName username' },
    ]);

    res.status(201).json({ message: "Bron muvaffaqiyatli yaratildi.", reservation: populated });
  } catch (err) {
    res.status(500).json({ message: 'Server xatosi', error: err });
  }
};

// Bronni tasdiqlash
export const confirmReservation = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const reservation = await Reservation.findById(req.params.id);
    if (!reservation) { res.status(404).json({ message: 'Bron topilmadi.' }); return; }
    if (reservation.status !== 'pending') {
      res.status(400).json({ message: `Bron holati: ${reservation.status}. Faqat "pending" bronlarni tasdiqlash mumkin.` });
      return;
    }
    reservation.status = 'confirmed';
    await reservation.save();
    res.json({ message: 'Bron tasdiqlandi.', reservation });
  } catch (err) {
    res.status(500).json({ message: 'Server xatosi', error: err });
  }
};

// Bronni bekor qilish
export const cancelReservation = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const reservation = await Reservation.findById(req.params.id);
    if (!reservation) { res.status(404).json({ message: 'Bron topilmadi.' }); return; }
    if (reservation.status === 'checked_in' || reservation.status === 'cancelled') {
      res.status(400).json({ message: 'Bu bronni bekor qilish mumkin emas.' });
      return;
    }
    reservation.status = 'cancelled';
    await reservation.save();
    res.json({ message: "Bron bekor qilindi.", reservation });
  } catch (err) {
    res.status(500).json({ message: 'Server xatosi', error: err });
  }
};

// Bronni o'chirish
export const deleteReservation = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const reservation = await Reservation.findByIdAndDelete(req.params.id);
    if (!reservation) { res.status(404).json({ message: 'Bron topilmadi.' }); return; }
    res.json({ message: "Bron o'chirildi." });
  } catch (err) {
    res.status(500).json({ message: 'Server xatosi', error: err });
  }
};
