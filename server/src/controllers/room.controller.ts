import { Response } from 'express';
import Room from '../models/Room';
import { AuthRequest } from '../middleware/auth.middleware';
import { logActivity } from '../utils/helpers';

export const getAllRooms = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { status, type, floor } = req.query;
    const filter: any = {};

    if (status) filter.status = status;
    if (type) filter.type = type;
    if (floor) filter.floor = Number(floor);

    const rooms = await Room.find(filter)
      .populate('currentBooking')
      .populate('currentBookings')
      .sort({ roomNumber: 1 });

    res.json({ rooms, total: rooms.length });
  } catch (error) {
    console.error('Get rooms xatosi:', error);
    res.status(500).json({ message: 'Server xatosi.' });
  }
};

export const getRoomById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const room = await Room.findById(req.params.id)
      .populate({
        path: 'currentBooking',
        populate: [
          { path: 'byReceptionist', select: 'fullName role' },
        ],
      })
      .populate({
        path: 'currentBookings',
        populate: [
          { path: 'byReceptionist', select: 'fullName role' },
        ],
      });

    if (!room) {
      res.status(404).json({ message: 'Xona topilmadi.' });
      return;
    }

    // Maintenance: qancha kun bo'ldi va qachon o'zgarganini hisoblash
    let maintenanceDays: number | null = null;
    if (room.status === 'maintenance') {
      const diffMs = Date.now() - new Date(room.updatedAt).getTime();
      maintenanceDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    }

    res.json({ room, maintenanceDays });
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi.' });
  }
};

export const createRoom = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { roomNumber, type, floor, capacity, pricePerNight, amenities, description, imageUrl, status } = req.body;

    const existingRoom = await Room.findOne({ roomNumber });
    if (existingRoom) {
      res.status(400).json({ message: `${roomNumber} raqamli xona allaqachon mavjud.` });
      return;
    }

    const room = await Room.create({
      roomNumber,
      type,
      floor,
      capacity,
      pricePerNight,
      amenities: amenities || [],
      description,
      imageUrl: imageUrl || null,
      status: status || 'available',
    });

    if (req.user) {
      await logActivity(req.user._id, 'room_create', `Yangi xona yaratildi: ${roomNumber}`, 'room', room._id);
    }

    // Socket.io event
    const io = req.app.get('io');
    if (io) io.emit('room:created', room);

    res.status(201).json({ message: 'Xona muvaffaqiyatli yaratildi.', room });
  } catch (error) {
    console.error('Create room xatosi:', error);
    res.status(500).json({ message: 'Server xatosi.' });
  }
};


export const updateRoom = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { roomNumber, type, floor, capacity, pricePerNight, amenities, description, imageUrl, status } = req.body;

    const room = await Room.findById(req.params.id);
    if (!room) {
      res.status(404).json({ message: 'Xona topilmadi.' });
      return;
    }

    if (roomNumber && roomNumber !== room.roomNumber) {
      const existingRoom = await Room.findOne({ roomNumber });
      if (existingRoom) {
        res.status(400).json({ message: `${roomNumber} raqamli xona allaqachon mavjud.` });
        return;
      }
    }

    const validStatuses = ['available', 'cleaning', 'maintenance'];
    // 'booked' statusini manual o'zgartirib bo'lmaydi
    if (status && !validStatuses.includes(status)) {
      res.status(400).json({ message: 'Bu status qo\'lda o\'zgartirib bo\'lmaydi.' });
      return;
    }

    Object.assign(room, {
      ...(roomNumber && { roomNumber }),
      ...(type && { type }),
      ...(floor && { floor }),
      ...(capacity !== undefined && { capacity }),
      ...(pricePerNight !== undefined && { pricePerNight }),
      ...(amenities && { amenities }),
      ...(description !== undefined && { description }),
      ...(imageUrl !== undefined && { imageUrl }),
      ...(status && { status }),
    });

    await room.save();

    if (req.user) {
      await logActivity(req.user._id, 'room_update', `Xona yangilandi: ${room.roomNumber}`, 'room', room._id);
    }

    const io = req.app.get('io');
    if (io) io.emit('room:updated', room);

    res.json({ message: 'Xona yangilandi.', room });
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi.' });
  }
};

export const updateRoomStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { status } = req.body;
    const validStatuses = ['available', 'booked', 'cleaning', 'maintenance'];

    if (!validStatuses.includes(status)) {
      res.status(400).json({ message: 'Yaroqsiz status.' });
      return;
    }

    const room = await Room.findById(req.params.id);
    if (!room) {
      res.status(404).json({ message: 'Xona topilmadi.' });
      return;
    }

    const oldStatus = room.status;
    room.status = status;

    // Agar bo'sh qilinsa, bookingni tozalash
    if (status === 'available') {
      room.currentBooking = undefined;

      // Ushbu xonaga bog'liq yetim active bookinglarni bekor qilish
      const Booking = (await import('../models/Booking')).default;
      await Booking.updateMany(
        { room: room._id, status: 'active' },
        { $set: { status: 'cancelled' } }
      );
    }

    await room.save();

    if (req.user) {
      await logActivity(
        req.user._id,
        'room_status_change',
        `Xona ${room.roomNumber} statusi: ${oldStatus} → ${status} (majburiy)`,
        'room',
        room._id
      );
    }

    const io = req.app.get('io');
    if (io) {
      io.emit('room:statusChanged', { roomId: room._id, status, roomNumber: room.roomNumber });
      io.emit('dashboard:update', { type: 'roomForceAvailable' });
    }

    res.json({ message: `Xona ${room.roomNumber} bo'shatildi.`, room });
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi.' });
  }
};


export const deleteRoom = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) {
      res.status(404).json({ message: 'Xona topilmadi.' });
      return;
    }

    if (room.status === 'booked') {
      res.status(400).json({ message: 'Band xonani o\'chirib bo\'lmaydi. Avval mijozni chiqaring.' });
      return;
    }

    await Room.findByIdAndDelete(req.params.id);

    if (req.user) {
      await logActivity(req.user._id, 'room_delete', `Xona o'chirildi: ${room.roomNumber}`, 'room', room._id);
    }

    const io = req.app.get('io');
    if (io) io.emit('room:deleted', { roomId: room._id });

    res.json({ message: 'Xona o\'chirildi.' });
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi.' });
  }
};
