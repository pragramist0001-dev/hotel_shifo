import { Response } from 'express';
import Booking from '../models/Booking';
import Room from '../models/Room';
import Transaction from '../models/Transaction';
import { AuthRequest } from '../middleware/auth.middleware';
import { logActivity } from '../utils/helpers';
import { calculateOvertime } from '../services/overtime.service';

export const checkIn = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { roomId, guestDetails, checkInDate, checkOutDate, paymentMethod, paidAmount, notes, pricePerPerson, negotiatedPrice } = req.body;

    // Xonani tekshirish
    const room = await Room.findById(roomId);
    if (!room) {
      res.status(404).json({ message: 'Xona topilmadi.' });
      return;
    }
    if (room.status !== 'available') {
      res.status(400).json({ message: `Xona ${room.roomNumber} hozirda ${room.status} holatida. Bo'sh xona tanlang.` });
      return;
    }

    // Oilaviy holat validatsiyasi
    if (guestDetails.maritalStatus === 'married') {
      if (!guestDetails.spouseDetails?.fullName) {
        res.status(400).json({ message: 'Turmush o\'rtog\'ining ismi majburiy.' });
        return;
      }
    }

    const parsedCheckIn = new Date(checkInDate);
    const parsedCheckOut = new Date(checkOutDate);
    
    // Calculate nights between dates
    const diffTime = Math.abs(parsedCheckOut.getTime() - parsedCheckIn.getTime());
    let calculatedNights = Math.round(diffTime / (1000 * 60 * 60 * 24));
    if (calculatedNights < 1) calculatedNights = 1;

    const spouseCount = (guestDetails.maritalStatus === 'married' && guestDetails.spouseDetails?.fullName) ? 1 : 0;
    const numberOfPeople = 1 + spouseCount + (guestDetails.familyMembers?.length || 0);
    const basePrice = pricePerPerson ? Number(pricePerPerson) : room.pricePerNight;
    
    let totalPrice = basePrice * numberOfPeople * calculatedNights;
    
    if (negotiatedPrice !== undefined && negotiatedPrice !== null && String(negotiatedPrice).trim() !== '') {
      totalPrice = Number(negotiatedPrice);
    }
    const actualPaid = paidAmount || 0;

    let paymentStatus: 'paid' | 'partially_paid' | 'unpaid' = 'unpaid';
    if (actualPaid >= totalPrice) paymentStatus = 'paid';
    else if (actualPaid > 0) paymentStatus = 'partially_paid';

    // Booking yaratish
    const booking = await Booking.create({
      room: room._id,
      guestDetails,
      checkInDate: parsedCheckIn,
      checkOutDate: parsedCheckOut,
      numberOfNights: calculatedNights,
      pricePerPerson: pricePerPerson ? Number(pricePerPerson) : undefined,
      negotiatedPrice: negotiatedPrice ? Number(negotiatedPrice) : undefined,
      totalPrice,
      paidAmount: actualPaid,
      paymentStatus,
      paymentMethod,
      additionalCharges: [], // Kunlik chiqimlar tranzaksiya bo'lib yoziladi, mijoz hisobiga qo'shilmaydi
      overtimeCharge: 0,
      status: 'active',
      byReceptionist: req.user!._id,
      notes,
    });

    // Kunlik chiqimlarni (Xarajatlarni) tranzaksiya sifatida saqlash
    const { additionalCharges } = req.body;
    if (additionalCharges && Array.isArray(additionalCharges)) {
      for (const charge of additionalCharges) {
        if (charge.amount > 0) {
          await Transaction.create({
            type: 'expense',
            category: 'daily_expense',
            amount: charge.amount,
            description: `Xona ${room.roomNumber} - ${charge.description}`,
            relatedBooking: booking._id,
            createdBy: req.user!._id,
            date: new Date(),
          });
        }
      }
    }

    // Xonani band qilish
    room.status = 'booked';
    room.currentBooking = booking._id;
    await room.save();

    // Kirim tranzaksiyasi
    if (actualPaid > 0) {
      await Transaction.create({
        type: 'income',
        category: 'room_payment',
        amount: actualPaid,
        description: `Xona ${room.roomNumber} - ${guestDetails.fullName} check-in to'lovi`,
        paymentMethod,
        relatedBooking: booking._id,
        createdBy: req.user!._id,
        date: new Date(),
      });
    }

    await logActivity(
      req.user!._id,
      'check_in',
      `${guestDetails.fullName} xona ${room.roomNumber}ga joylashtirildi (${calculatedNights} kecha)`,
      'booking',
      booking._id
    );

    // Socket.io events
    const io = req.app.get('io');
    if (io) {
      io.emit('booking:newCheckIn', {
        booking: await booking.populate('room'),
        roomNumber: room.roomNumber,
      });
      io.emit('room:statusChanged', { roomId: room._id, status: 'booked', roomNumber: room.roomNumber });
      io.emit('dashboard:update', { type: 'checkIn' });
    }

    const populatedBooking = await Booking.findById(booking._id)
      .populate('room')
      .populate('byReceptionist', 'fullName');

    res.status(201).json({
      message: `${guestDetails.fullName} xona ${room.roomNumber}ga muvaffaqiyatli joylashtirildi!`,
      booking: populatedBooking,
    });
  } catch (error) {
    console.error('Check-in xatosi:', error);
    res.status(500).json({ message: 'Server xatosi.' });
  }
};

export const checkOut = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { additionalCharges } = req.body;

    const booking = await Booking.findById(req.params.id).populate('room');
    if (!booking) {
      res.status(404).json({ message: 'Booking topilmadi.' });
      return;
    }
    if (booking.status !== 'active') {
      res.status(400).json({ message: 'Bu booking allaqachon yakunlangan.' });
      return;
    }

    const room = await Room.findById(booking.room);
    if (!room) {
      res.status(404).json({ message: 'Xona topilmadi.' });
      return;
    }

    const actualCheckOut = new Date();
    booking.actualCheckOut = actualCheckOut;

    // Overtime hisoblash
    const overtime = calculateOvertime(booking.checkOutDate, actualCheckOut, room.pricePerNight);
    booking.overtimeCharge = overtime.overtimeCharge;

    // Qo'shimcha xizmatlar
    if (additionalCharges && additionalCharges.length > 0) {
      booking.additionalCharges = additionalCharges;
    }

    // Umumiy narxni qayta hisoblash
    const additionalTotal = booking.additionalCharges.reduce((sum, ch) => sum + ch.amount, 0);
    // pricePerPerson mavjud bo'lsa ishlatamiz, aks holda xona narxi
    const effectivePrice = booking.pricePerPerson ?? room.pricePerNight;
    const spouseCount = (booking.guestDetails.maritalStatus === 'married' && booking.guestDetails.spouseDetails?.fullName) ? 1 : 0;
    const numberOfPeople = 1 + spouseCount + (booking.guestDetails.familyMembers?.length || 0);
    booking.totalPrice = (effectivePrice * numberOfPeople * booking.numberOfNights) + overtime.overtimeCharge + additionalTotal;

    // To'lov statusini yangilash
    if (booking.paidAmount >= booking.totalPrice) {
      booking.paymentStatus = 'paid';
    } else if (booking.paidAmount > 0) {
      booking.paymentStatus = 'partially_paid';
    }

    booking.status = 'checked_out';
    await booking.save();

    // Xonani tozalanmoqda statusiga o'tkazish
    room.status = 'cleaning';
    room.currentBooking = undefined;
    await room.save();

    // Qo'shimcha to'lov tranzaksiyasi
    const extraCharges = overtime.overtimeCharge + additionalTotal;
    if (extraCharges > 0) {
      await Transaction.create({
        type: 'income',
        category: 'additional_service',
        amount: extraCharges,
        description: `Xona ${room.roomNumber} - ${booking.guestDetails.fullName} qo'shimcha xizmatlar`,
        relatedBooking: booking._id,
        createdBy: req.user!._id,
        date: new Date(),
      });
    }

    await logActivity(
      req.user!._id,
      'check_out',
      `${booking.guestDetails.fullName} xona ${room.roomNumber}dan chiqdi`,
      'booking',
      booking._id
    );

    const io = req.app.get('io');
    if (io) {
      io.emit('booking:checkOut', { bookingId: booking._id, roomNumber: room.roomNumber });
      io.emit('room:statusChanged', { roomId: room._id, status: 'cleaning', roomNumber: room.roomNumber });
      io.emit('dashboard:update', { type: 'checkOut' });
    }

    res.json({
      message: `${booking.guestDetails.fullName} xona ${room.roomNumber}dan muvaffaqiyatli chiqdi!`,
      booking,
      overtime,
    });
  } catch (error) {
    console.error('Check-out xatosi:', error);
    res.status(500).json({ message: 'Server xatosi.' });
  }
};

export const getAllBookings = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const filter: any = {};
    if (status) filter.status = status;

    const skip = (Number(page) - 1) * Number(limit);
    const bookings = await Booking.find(filter)
      .populate('room', 'roomNumber type floor pricePerNight')
      .populate('byReceptionist', 'fullName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await Booking.countDocuments(filter);

    res.json({ bookings, total, page: Number(page), totalPages: Math.ceil(total / Number(limit)) });
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi.' });
  }
};

export const getActiveBookings = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const bookings = await Booking.find({ status: 'active' })
      .populate('room', 'roomNumber type floor pricePerNight')
      .populate('byReceptionist', 'fullName')
      .sort({ checkOutDate: 1 });

    res.json({ bookings, total: bookings.length });
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi.' });
  }
};

export const getBookingById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('room')
      .populate('byReceptionist', 'fullName');

    if (!booking) {
      res.status(404).json({ message: 'Booking topilmadi.' });
      return;
    }

    res.json({ booking });
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi.' });
  }
};

export const addPayment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { amount, paymentMethod } = req.body;
    const booking = await Booking.findById(req.params.id).populate('room');
    if (!booking) {
      res.status(404).json({ message: 'Booking topilmadi.' });
      return;
    }

    booking.paidAmount += amount;
    if (booking.paidAmount >= booking.totalPrice) {
      booking.paymentStatus = 'paid';
    } else {
      booking.paymentStatus = 'partially_paid';
    }
    await booking.save();

    await Transaction.create({
      type: 'income',
      category: 'room_payment',
      amount,
      description: `Xona ${(booking.room as any).roomNumber} - ${booking.guestDetails.fullName} qo'shimcha to'lov`,
      paymentMethod,
      relatedBooking: booking._id,
      createdBy: req.user!._id,
      date: new Date(),
    });

    const io = req.app.get('io');
    if (io) io.emit('dashboard:update', { type: 'payment' });

    res.json({ message: 'To\'lov qabul qilindi.', booking });
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi.' });
  }
};

export const updateBooking = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { checkInDate, checkOutDate, paidAmount, paymentMethod, status, guestDetails } = req.body;

    const booking = await Booking.findById(id).populate('room');
    if (!booking) {
       res.status(404).json({ message: 'Booking topilmadi.' });
       return;
    }

    const room = booking.room as any;
    
    if (checkInDate) booking.checkInDate = new Date(checkInDate);
    if (checkOutDate) booking.checkOutDate = new Date(checkOutDate);
    if (status) booking.status = status;
    
    // Mijoz ma'lumotlarini tahrirlash
    if (guestDetails) {
      if (guestDetails.fullName !== undefined) booking.guestDetails.fullName = guestDetails.fullName;
      if (guestDetails.phone !== undefined) booking.guestDetails.phone = guestDetails.phone;
      if (guestDetails.historyNumber !== undefined) booking.guestDetails.historyNumber = guestDetails.historyNumber;
      if (guestDetails.birthYear !== undefined) booking.guestDetails.birthYear = guestDetails.birthYear;
      if (guestDetails.birthDate !== undefined) booking.guestDetails.birthDate = guestDetails.birthDate;
      if (guestDetails.country !== undefined) booking.guestDetails.country = guestDetails.country;
      if (guestDetails.passportSeries !== undefined) booking.guestDetails.passportSeries = guestDetails.passportSeries;
    }

    if (checkInDate || checkOutDate) {
      const d1 = new Date(booking.checkInDate);
      const d2 = new Date(booking.checkOutDate);
      const diffTime = Math.abs(d2.getTime() - d1.getTime());
      let nights = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (nights < 1) nights = 1;
      booking.numberOfNights = nights;

      // pricePerPerson mavjud bo'lsa ishlatamiz
      const effectivePrice = booking.pricePerPerson ?? room.pricePerNight;
      const spouseCount = (booking.guestDetails.maritalStatus === 'married' && booking.guestDetails.spouseDetails?.fullName) ? 1 : 0;
      const numberOfPeople = 1 + spouseCount + (booking.guestDetails.familyMembers?.length || 0);
      const basePrice = effectivePrice * numberOfPeople * nights;
      const additionalTotal = booking.additionalCharges.reduce((sum, ch) => sum + ch.amount, 0);
      booking.totalPrice = basePrice + booking.overtimeCharge + additionalTotal;
    }

    if (paidAmount !== undefined) {
      const diffAmount = paidAmount - booking.paidAmount;
      booking.paidAmount = paidAmount;
      
      if (diffAmount > 0) {
        await Transaction.create({
          type: 'income',
          category: 'room_payment',
          amount: diffAmount,
          description: `Xona ${room.roomNumber} - ${booking.guestDetails.fullName} qo'shimcha to'lov (tahrirlangan)`,
          paymentMethod: paymentMethod || booking.paymentMethod,
          relatedBooking: booking._id,
          createdBy: req.user!._id,
          date: new Date(),
        });
      }
    }
    
    if (booking.paidAmount >= booking.totalPrice) {
      booking.paymentStatus = 'paid';
    } else if (booking.paidAmount > 0) {
      booking.paymentStatus = 'partially_paid';
    } else {
      booking.paymentStatus = 'unpaid';
    }

    await booking.save();
    
    const io = req.app.get('io');
    if (io) io.emit('dashboard:update', { type: 'bookingUpdate' });

    res.json({ message: 'Ma\'lumotlar muvaffaqiyatli yangilandi.', booking });
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi.' });
  }
};

export const deleteBooking = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const booking = await Booking.findById(id);
    if (!booking) {
       res.status(404).json({ message: 'Booking topilmadi.' });
       return;
    }
    
    if (booking.status === 'active') {
      const room = await Room.findById(booking.room);
      if (room) {
        room.status = 'available';
        room.currentBooking = undefined;
        await room.save();
        const io = req.app.get('io');
        if (io) io.emit('room:statusChanged', { roomId: room._id, status: 'available', roomNumber: room.roomNumber });
      }
    }
    
    await Transaction.deleteMany({ relatedBooking: id });
    await Booking.findByIdAndDelete(id);

    const io = req.app.get('io');
    if (io) io.emit('dashboard:update', { type: 'bookingDelete' });

    res.json({ message: 'Mijoz muvaffaqiyatli o\'chirildi.' });
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi.' });
  }
};

export const freezeBooking = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const booking = await Booking.findById(req.params.id).populate('room');
    if (!booking || booking.status !== 'active') {
      res.status(400).json({ message: 'Booking topilmadi yoki faol emas.' });
      return;
    }

    const room = await Room.findById(booking.room);
    if (!room) {
      res.status(404).json({ message: 'Xona topilmadi.' });
      return;
    }

    const actualCheckOut = new Date();
    booking.actualCheckOut = actualCheckOut;

    const diffTime = Math.abs(actualCheckOut.getTime() - new Date(booking.checkInDate).getTime());
    let daysStayed = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (daysStayed < 1) daysStayed = 1;

    const dailyRate = booking.totalPrice / booking.numberOfNights;
    const cost = daysStayed * dailyRate;

    let remaining = booking.paidAmount - cost;
    if (remaining < 0) remaining = 0;

    booking.frozenBalance = remaining;
    booking.status = 'frozen';
    await booking.save();

    room.status = 'cleaning';
    room.currentBooking = undefined;
    await room.save();

    await logActivity(req.user!._id, 'freeze_booking', `${booking.guestDetails.fullName} muzlatildi. Qolgan summa: ${remaining.toLocaleString()} UZS`, 'booking', booking._id);

    const io = req.app.get('io');
    if (io) {
      io.emit('booking:update');
      io.emit('room:statusChanged', { roomId: room._id, status: 'cleaning', roomNumber: room.roomNumber });
      io.emit('dashboard:update', { type: 'freeze' });
    }

    res.json({ message: 'Mijoz muvaffaqiyatli muzlatildi.', booking });
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi.' });
  }
};

export const resumeBooking = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { roomId, checkOutDate } = req.body;
    const booking = await Booking.findById(req.params.id);
    if (!booking || booking.status !== 'frozen') {
      res.status(400).json({ message: 'Faqat muzlatilgan mijozni davom ettirish mumkin.' });
      return;
    }

    const room = await Room.findById(roomId);
    if (!room || room.status !== 'available') {
      res.status(400).json({ message: 'Tanlangan xona bo\'sh emas.' });
      return;
    }

    const parsedCheckIn = new Date();
    const parsedCheckOut = new Date(checkOutDate);
    const diffTime = Math.abs(parsedCheckOut.getTime() - parsedCheckIn.getTime());
    let nights = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (nights < 1) nights = 1;

    const spouseCount = (booking.guestDetails.maritalStatus === 'married' && booking.guestDetails.spouseDetails?.fullName) ? 1 : 0;
    const numberOfPeople = 1 + spouseCount + (booking.guestDetails.familyMembers?.length || 0);
    const basePrice = booking.pricePerPerson ? booking.pricePerPerson : room.pricePerNight;
    let newTotalPrice = basePrice * numberOfPeople * nights;

    booking.room = room._id;
    booking.checkInDate = parsedCheckIn;
    booking.checkOutDate = parsedCheckOut;
    booking.actualCheckOut = undefined;
    booking.numberOfNights = nights;
    booking.totalPrice = newTotalPrice;
    
    booking.paidAmount = booking.frozenBalance || 0;
    booking.frozenBalance = 0;
    
    if (booking.paidAmount >= booking.totalPrice) {
      booking.paymentStatus = 'paid';
    } else if (booking.paidAmount > 0) {
      booking.paymentStatus = 'partially_paid';
    } else {
      booking.paymentStatus = 'unpaid';
    }

    booking.status = 'active';
    await booking.save();

    room.status = 'booked';
    room.currentBooking = booking._id;
    await room.save();

    await logActivity(req.user!._id, 'resume_booking', `${booking.guestDetails.fullName} xona ${room.roomNumber}da davom etmoqda`, 'booking', booking._id);

    const io = req.app.get('io');
    if (io) {
      io.emit('booking:update');
      io.emit('room:statusChanged', { roomId: room._id, status: 'booked', roomNumber: room.roomNumber });
      io.emit('dashboard:update', { type: 'resume' });
    }

    res.json({ message: 'Mijoz muvaffaqiyatli davom ettirildi.', booking });
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi.' });
  }
};

export const removeFamilyMember = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { memberIndex } = req.body;
    const booking = await Booking.findById(req.params.id);
    
    if (!booking || booking.status !== 'active') {
      res.status(400).json({ message: 'Booking topilmadi yoki faol emas.' });
      return;
    }

    if (!booking.guestDetails.familyMembers || booking.guestDetails.familyMembers.length <= memberIndex) {
      res.status(400).json({ message: 'Hamroh topilmadi.' });
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkOut = new Date(booking.checkOutDate);
    checkOut.setHours(0, 0, 0, 0);
    if (checkOut <= today) {
      res.status(400).json({ message: 'Muddat allaqachon tugagan.' });
      return;
    }

    const diffTime = Math.abs(checkOut.getTime() - today.getTime());
    const daysRemaining = diffTime / (1000 * 60 * 60 * 24);

    const spouseCount = (booking.guestDetails.maritalStatus === 'married' && booking.guestDetails.spouseDetails?.fullName) ? 1 : 0;
    const oldTotalPeople = 1 + spouseCount + booking.guestDetails.familyMembers.length;
    const remainingPeopleCount = oldTotalPeople - 1;

    let daysToAdd = 0;
    if (remainingPeopleCount > 0) {
      daysToAdd = daysRemaining / remainingPeopleCount;
    }

    const removedMember = booking.guestDetails.familyMembers[memberIndex];
    booking.guestDetails.familyMembers.splice(memberIndex, 1);

    const newCheckOut = new Date(booking.checkOutDate);
    const hoursToAdd = Math.round(daysToAdd * 24);
    newCheckOut.setHours(newCheckOut.getHours() + hoursToAdd);
    booking.checkOutDate = newCheckOut;
    booking.numberOfNights += daysToAdd;
    booking.numberOfNights = Math.round(booking.numberOfNights * 10) / 10;

    booking.notes = (booking.notes ? booking.notes + '\n' : '') + `${today.toLocaleDateString()}: Hamroh (${removedMember.fullName}) erta ketdi. ${Math.round(daysToAdd * 10) / 10} kun qo'shildi.`;

    await booking.save();

    await logActivity(req.user!._id, 'remove_family_member', `${removedMember.fullName} ketdi, ${Math.round(daysToAdd * 10) / 10} kun uzaytirildi.`, 'booking', booking._id);

    const io = req.app.get('io');
    if (io) {
      io.emit('booking:update');
      io.emit('dashboard:update', { type: 'family_remove' });
    }

    res.json({ message: `Hamroh chiqarildi va muddat ${Math.round(daysToAdd * 10) / 10} kunga uzaytirildi.`, booking });
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi.' });
  }
};

export const removeSpouse = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const booking = await Booking.findById(req.params.id);
    
    if (!booking || booking.status !== 'active') {
      res.status(400).json({ message: 'Booking topilmadi yoki faol emas.' });
      return;
    }

    if (booking.guestDetails.maritalStatus !== 'married' || !booking.guestDetails.spouseDetails?.fullName) {
      res.status(400).json({ message: 'Turmush o\'rtog\'i topilmadi.' });
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkOut = new Date(booking.checkOutDate);
    checkOut.setHours(0, 0, 0, 0);
    if (checkOut <= today) {
      res.status(400).json({ message: 'Muddat allaqachon tugagan.' });
      return;
    }

    const diffTime = Math.abs(checkOut.getTime() - today.getTime());
    const daysRemaining = diffTime / (1000 * 60 * 60 * 24);

    const oldTotalPeople = 1 + 1 + (booking.guestDetails.familyMembers?.length || 0); // main + spouse + family
    const remainingPeopleCount = oldTotalPeople - 1;

    let daysToAdd = 0;
    if (remainingPeopleCount > 0) {
      daysToAdd = daysRemaining / remainingPeopleCount;
    }

    const removedSpouseName = booking.guestDetails.spouseDetails.fullName;
    
    // Turmush o'rtog'ini olib tashlash
    booking.guestDetails.maritalStatus = 'single';
    booking.guestDetails.spouseDetails = undefined;

    const newCheckOut = new Date(booking.checkOutDate);
    const hoursToAdd = Math.round(daysToAdd * 24);
    newCheckOut.setHours(newCheckOut.getHours() + hoursToAdd);
    booking.checkOutDate = newCheckOut;
    booking.numberOfNights += daysToAdd;
    booking.numberOfNights = Math.round(booking.numberOfNights * 10) / 10;

    booking.notes = (booking.notes ? booking.notes + '\n' : '') + `${today.toLocaleDateString()}: Turmush o'rtog'i (${removedSpouseName}) erta ketdi. ${Math.round(daysToAdd * 10) / 10} kun qo'shildi.`;

    await booking.save();

    await logActivity(req.user!._id, 'remove_spouse', `${removedSpouseName} ketdi, ${Math.round(daysToAdd * 10) / 10} kun uzaytirildi.`, 'booking', booking._id);

    const io = req.app.get('io');
    if (io) {
      io.emit('booking:update');
      io.emit('dashboard:update', { type: 'family_remove' });
    }

    res.json({ message: `Turmush o'rtog'i chiqarildi va muddat ${Math.round(daysToAdd * 10) / 10} kunga uzaytirildi.`, booking });
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi.' });
  }
};

export const removeMainGuest = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const booking = await Booking.findById(req.params.id);
    
    if (!booking || booking.status !== 'active') {
      res.status(400).json({ message: 'Booking topilmadi yoki faol emas.' });
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0); // sana bo'yicha solishtirish
    const checkOut = new Date(booking.checkOutDate);
    checkOut.setHours(0, 0, 0, 0);
    if (checkOut <= today) {
      res.status(400).json({ message: 'Muddat allaqachon tugagan.' });
      return;
    }

    const diffTime = Math.abs(checkOut.getTime() - today.getTime());
    const daysRemaining = diffTime / (1000 * 60 * 60 * 24);

    const hasSpouse = booking.guestDetails.maritalStatus === 'married' && booking.guestDetails.spouseDetails?.fullName ? 1 : 0;
    const familyMembersCount = booking.guestDetails.familyMembers?.length || 0;
    const oldTotalPeople = 1 + hasSpouse + familyMembersCount;
    const remainingPeopleCount = oldTotalPeople - 1;

    if (remainingPeopleCount <= 0) {
      res.status(400).json({ message: 'Bu yagona mehmon. Check-out tugmasidan foydalaning.' });
      return;
    }

    const daysToAdd = daysRemaining / remainingPeopleCount;
    const removedMainGuestName = booking.guestDetails.fullName;

    // Promote: first try family member, then spouse
    if (familyMembersCount > 0) {
      const promotedMember = booking.guestDetails.familyMembers![0];
      booking.guestDetails.fullName = promotedMember.fullName;
      booking.guestDetails.birthYear = promotedMember.birthYear;
      if (promotedMember.birthDate) booking.guestDetails.birthDate = promotedMember.birthDate;
      booking.guestDetails.gender = promotedMember.gender as any;
      if (promotedMember.passportSeries) booking.guestDetails.passportSeries = promotedMember.passportSeries;
      booking.guestDetails.familyMembers!.shift();
      booking.notes = (booking.notes ? booking.notes + '\n' : '') + `${today.toLocaleDateString()}: Asosiy mehmon (${removedMainGuestName}) erta ketdi. ${promotedMember.fullName} yangi asosiy mehmon. ${Math.round(daysToAdd * 10) / 10} kun qo'shildi.`;
    } else if (hasSpouse && booking.guestDetails.spouseDetails) {
      // Promote spouse to main guest
      const spouseName = booking.guestDetails.spouseDetails.fullName;
      booking.guestDetails.fullName = spouseName;
      if ((booking.guestDetails.spouseDetails as any).birthYear) {
        booking.guestDetails.birthYear = (booking.guestDetails.spouseDetails as any).birthYear;
      }
      if ((booking.guestDetails.spouseDetails as any).birthDate) {
        booking.guestDetails.birthDate = (booking.guestDetails.spouseDetails as any).birthDate;
      }
      booking.guestDetails.maritalStatus = 'single';
      booking.guestDetails.spouseDetails = undefined;
      booking.notes = (booking.notes ? booking.notes + '\n' : '') + `${today.toLocaleDateString()}: Asosiy mehmon (${removedMainGuestName}) erta ketdi. ${spouseName} yangi asosiy mehmon. ${Math.round(daysToAdd * 10) / 10} kun qo'shildi.`;
    }

    const newCheckOut = new Date(booking.checkOutDate);
    const hoursToAdd = Math.round(daysToAdd * 24);
    newCheckOut.setHours(newCheckOut.getHours() + hoursToAdd);
    booking.checkOutDate = newCheckOut;
    booking.numberOfNights += daysToAdd;
    booking.numberOfNights = Math.round(booking.numberOfNights * 10) / 10;

    await booking.save();

    await logActivity(req.user!._id, 'remove_main_guest', `${removedMainGuestName} ketdi, ${Math.round(daysToAdd * 10) / 10} kun uzaytirildi.`, 'booking', booking._id);

    const io = req.app.get('io');
    if (io) {
      io.emit('booking:update');
      io.emit('dashboard:update', { type: 'family_remove' });
    }

    res.json({ message: `Asosiy mehmon chiqarildi va muddat ${Math.round(daysToAdd * 10) / 10} kunga uzaytirildi.`, booking });
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi.' });
  }
};

export const getClientBookings = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { phone } = req.params;
    const bookings = await Booking.find({ 'guestDetails.phone': phone })
      .populate('room', 'roomNumber type floor pricePerNight')
      .populate('byReceptionist', 'fullName')
      .sort({ createdAt: -1 });

    if (!bookings || bookings.length === 0) {
      res.status(404).json({ message: 'Mijoz topilmadi.' });
      return;
    }

    // Eng so'nggi ma'lumotlari
    const latestBooking = bookings[0];
    const clientDetails = latestBooking.guestDetails;

    // Statistika hisoblash
    const totalVisits = bookings.length;
    const totalSpent = bookings.reduce((sum, b) => sum + b.paidAmount, 0);
    let totalDebt = 0;
    bookings.forEach(b => {
      const debt = b.totalPrice - b.paidAmount;
      if (debt > 0) totalDebt += debt;
    });

    const bookingIds = bookings.map(b => b._id);
    const expenses = await Transaction.find({
      relatedBooking: { $in: bookingIds },
      type: 'expense'
    });
    const totalExpense = expenses.reduce((sum, e) => sum + e.amount, 0);

    res.json({
      client: clientDetails,
      stats: {
        totalVisits,
        totalSpent,
        totalDebt,
        totalExpense
      },
      bookings
    });
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi.' });
  }
};

