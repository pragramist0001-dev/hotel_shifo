import request from 'supertest';
import { app, server } from '../../app';
import { connectDB, closeDB, clearDB } from '../setup';
import Room from '../../models/Room';
import Booking from '../../models/Booking';
import User from '../../models/User';
import Transaction from '../../models/Transaction';
import jwt from 'jsonwebtoken';

beforeAll(async () => {
  await connectDB();
});

afterAll(async () => {
  await closeDB();
  app.get('io').close();
  server.close();
});

afterEach(async () => {
  await clearDB();
});

let testUserId: string;

beforeEach(async () => {
  const user = await User.create({
    fullName: 'Test Admin',
    username: `testadmin_${Date.now()}_${Math.random()}`,
    password: 'password123',
    role: 'admin',
    isActive: true,
  });
  testUserId = user._id.toString();
});

const generateToken = () => {
  return jwt.sign({ userId: testUserId }, process.env.JWT_SECRET || 'secret');
};

// ========================
// CHECK-IN TESTLAR
// ========================
describe('Booking API - Check-in', () => {
  it('should successfully check-in a guest and calculate price', async () => {
    const room = await Room.create({
      roomNumber: '105',
      type: 'ekonom',
      floor: 1,
      pricePerNight: 200000,
      status: 'available',
    });

    const token = generateToken();
    const res = await request(app)
      .post('/api/bookings/check-in')
      .set('Authorization', `Bearer ${token}`)
      .send({
        roomId: room._id,
        guestDetails: {
          historyNumber: 'TEST-123',
          fullName: 'Sardor Abdullayev',
          phone: '+998901234567',
          maritalStatus: 'single',
          country: 'Uzbekistan',
          gender: 'male',
          birthYear: 1990,
        },
        checkInDate: new Date().toISOString(),
        checkOutDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        paymentMethod: 'cash',
        paidAmount: 400000,
      });

    expect(res.status).toBe(201);
    expect(res.body.booking.totalPrice).toBe(400000);
    expect(res.body.booking.paymentStatus).toBe('paid');

    const updatedRoom = await Room.findById(room._id);
    expect(updatedRoom?.status).toBe('booked');
    expect(updatedRoom?.occupiedBeds).toBe(1);
  });

  it('should check-in with family members and count them', async () => {
    const room = await Room.create({
      roomNumber: '110',
      type: 'lyuks',
      floor: 2,
      pricePerNight: 300000,
      capacity: 4,
      status: 'available',
    });

    const token = generateToken();
    const res = await request(app)
      .post('/api/bookings/check-in')
      .set('Authorization', `Bearer ${token}`)
      .send({
        roomId: room._id,
        guestDetails: {
          historyNumber: 'FAM-001',
          fullName: 'Akbar Toshmatov',
          phone: '+998901234567',
          maritalStatus: 'single',
          country: 'Uzbekistan',
          gender: 'male',
          familyMembers: [
            { historyNumber: 'FAM-002', fullName: 'Zulfiya Toshmatova', gender: 'female' },
            { historyNumber: 'FAM-003', fullName: 'Sherzod Toshmatov', gender: 'male' },
          ],
        },
        checkInDate: new Date().toISOString(),
        checkOutDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        paymentMethod: 'cash',
        paidAmount: 0,
      });

    expect(res.status).toBe(201);
    // 3 kishi * 3 kun * 300000 = 2,700,000
    expect(res.body.booking.totalPrice).toBe(2700000);

    const updatedRoom = await Room.findById(room._id);
    expect(updatedRoom?.status).toBe('booked');
    expect(updatedRoom?.occupiedBeds).toBe(3);
  });

  it('should allow check-in even when guests exceed room capacity', async () => {
    // Sig'im cheki bo'lmasligi kerak - har qanday miqdorda odam joylashishi mumkin
    const room = await Room.create({
      roomNumber: '111',
      type: 'ekonom',
      floor: 1,
      pricePerNight: 100000,
      capacity: 2, // sig'imi 2, lekin 4 kishi joylashishi kerak
      status: 'available',
    });

    const token = generateToken();
    const res = await request(app)
      .post('/api/bookings/check-in')
      .set('Authorization', `Bearer ${token}`)
      .send({
        roomId: room._id,
        guestDetails: {
          historyNumber: 'BIG-001',
          fullName: 'Bosh mehmon',
          phone: '+998901234567',
          maritalStatus: 'single',
          country: 'Uzbekistan',
          gender: 'male',
          familyMembers: [
            { historyNumber: 'BIG-002', fullName: 'Hamroh 1', gender: 'female' },
            { historyNumber: 'BIG-003', fullName: 'Hamroh 2', gender: 'male' },
            { historyNumber: 'BIG-004', fullName: 'Hamroh 3', gender: 'female' },
          ],
        },
        checkInDate: new Date().toISOString(),
        checkOutDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
        paymentMethod: 'cash',
        paidAmount: 0,
      });

    // Sig'im cheki yo'q - 201 bo'lishi kerak
    expect(res.status).toBe(201);
    const updatedRoom = await Room.findById(room._id);
    expect(updatedRoom?.status).toBe('booked');
    expect(updatedRoom?.occupiedBeds).toBe(4);
  });

  it('should not allow check-in if room is not available', async () => {
    const room = await Room.create({
      roomNumber: '106',
      type: 'ekonom',
      floor: 1,
      pricePerNight: 200000,
      status: 'cleaning',
    });

    const token = generateToken();
    const res = await request(app)
      .post('/api/bookings/check-in')
      .set('Authorization', `Bearer ${token}`)
      .send({
        roomId: room._id,
        guestDetails: {
          historyNumber: 'TEST-123',
          fullName: 'Olim',
          phone: '+998901234567',
          maritalStatus: 'single',
        },
        checkInDate: new Date().toISOString(),
        checkOutDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('cleaning holatida');
  });

  it('should require spouse details if married', async () => {
    const room = await Room.create({
      roomNumber: '107',
      type: 'ekonom',
      floor: 1,
      pricePerNight: 200000,
    });

    const token = generateToken();
    const res = await request(app)
      .post('/api/bookings/check-in')
      .set('Authorization', `Bearer ${token}`)
      .send({
        roomId: room._id,
        guestDetails: {
          historyNumber: 'TEST-123',
          fullName: 'Ali',
          phone: '+998901234567',
          maritalStatus: 'married',
        },
        checkInDate: new Date().toISOString(),
        checkOutDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain("Turmush o'rtog'ining ismi majburiy");
  });

  it('should apply negotiatedPrice when provided', async () => {
    const room = await Room.create({
      roomNumber: '108',
      type: 'ekonom',
      floor: 1,
      pricePerNight: 200000,
      status: 'available',
    });

    const token = generateToken();
    const res = await request(app)
      .post('/api/bookings/check-in')
      .set('Authorization', `Bearer ${token}`)
      .send({
        roomId: room._id,
        guestDetails: {
          historyNumber: 'NEG-001',
          fullName: 'Muzaffar',
          phone: '+998901234567',
          maritalStatus: 'single',
          country: 'Uzbekistan',
          gender: 'male',
        },
        checkInDate: new Date().toISOString(),
        checkOutDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        paymentMethod: 'cash',
        paidAmount: 300000,
        negotiatedPrice: 300000, // chegirma narx
      });

    expect(res.status).toBe(201);
    expect(res.body.booking.totalPrice).toBe(300000);
  });

  it('should create income transaction when paidAmount > 0', async () => {
    const room = await Room.create({
      roomNumber: '109',
      type: 'ekonom',
      floor: 1,
      pricePerNight: 200000,
      status: 'available',
    });

    const token = generateToken();
    await request(app)
      .post('/api/bookings/check-in')
      .set('Authorization', `Bearer ${token}`)
      .send({
        roomId: room._id,
        guestDetails: {
          historyNumber: 'TXN-001',
          fullName: 'Jahongir',
          phone: '+998901234567',
          maritalStatus: 'single',
          country: 'Uzbekistan',
          gender: 'male',
        },
        checkInDate: new Date().toISOString(),
        checkOutDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
        paymentMethod: 'cash',
        paidAmount: 150000,
      });

    const transactions = await Transaction.find({ type: 'income', category: 'room_payment' });
    expect(transactions.length).toBeGreaterThan(0);
    expect(transactions[0].amount).toBe(150000);
  });
});

// ========================
// CHECK-OUT TESTLAR
// ========================
describe('Booking API - Check-out', () => {
  it('should successfully check-out a guest and set room to cleaning', async () => {
    const room = await Room.create({
      roomNumber: '201',
      type: 'ekonom',
      floor: 2,
      pricePerNight: 200000,
      status: 'available',
    });

    const token = generateToken();
    // Avval check-in
    const checkInRes = await request(app)
      .post('/api/bookings/check-in')
      .set('Authorization', `Bearer ${token}`)
      .send({
        roomId: room._id,
        guestDetails: {
          historyNumber: 'CHK-001',
          fullName: 'Checkout Test',
          phone: '+998901234567',
          maritalStatus: 'single',
          country: 'Uzbekistan',
          gender: 'male',
        },
        checkInDate: new Date().toISOString(),
        checkOutDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        paymentMethod: 'cash',
        paidAmount: 400000,
      });

    expect(checkInRes.status).toBe(201);
    const bookingId = checkInRes.body.booking._id;

    // Check-out
    const checkOutRes = await request(app)
      .post(`/api/bookings/${bookingId}/check-out`)
      .set('Authorization', `Bearer ${token}`)
      .send({});

    expect(checkOutRes.status).toBe(200);
    expect(checkOutRes.body.booking.status).toBe('checked_out');

    const updatedRoom = await Room.findById(room._id);
    expect(updatedRoom?.status).toBe('cleaning');
    expect(updatedRoom?.occupiedBeds).toBe(0);
  });

  it('should not allow check-out for non-active booking', async () => {
    const room = await Room.create({
      roomNumber: '202',
      type: 'ekonom',
      floor: 2,
      pricePerNight: 200000,
      status: 'available',
    });

    const booking = await Booking.create({
      room: room._id,
      guestDetails: {
        historyNumber: 'DONE-001',
        fullName: 'Done Guest',
        phone: '+998901234567',
        maritalStatus: 'single',
        country: 'Uzbekistan',
        gender: 'male',
      },
      checkInDate: new Date(),
      checkOutDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
      numberOfNights: 1,
      totalPrice: 200000,
      paidAmount: 200000,
      paymentStatus: 'paid',
      paymentMethod: 'cash',
      status: 'checked_out', // allaqachon chiqib ketgan
      byReceptionist: testUserId,
    });

    const token = generateToken();
    const res = await request(app)
      .post(`/api/bookings/${booking._id}/check-out`)
      .set('Authorization', `Bearer ${token}`)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('allaqachon yakunlangan');
  });
});

// ========================
// TO'LOV TESTLAR
// ========================
describe('Booking API - Payments', () => {
  it('should add payment and update paymentStatus to paid', async () => {
    const room = await Room.create({
      roomNumber: '301',
      type: 'ekonom',
      floor: 3,
      pricePerNight: 200000,
      status: 'available',
    });

    const token = generateToken();
    const checkInRes = await request(app)
      .post('/api/bookings/check-in')
      .set('Authorization', `Bearer ${token}`)
      .send({
        roomId: room._id,
        guestDetails: {
          historyNumber: 'PAY-001',
          fullName: 'Tolov Test',
          phone: '+998901234567',
          maritalStatus: 'single',
          country: 'Uzbekistan',
          gender: 'male',
        },
        checkInDate: new Date().toISOString(),
        checkOutDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
        paymentMethod: 'cash',
        paidAmount: 0, // hech narsa to'lanmagan
      });

    const bookingId = checkInRes.body.booking._id;

    // To'lov qo'shish
    const payRes = await request(app)
      .post(`/api/bookings/${bookingId}/payment`)
      .set('Authorization', `Bearer ${token}`)
      .send({ amount: 200000, paymentMethod: 'cash' });

    expect(payRes.status).toBe(200);
    expect(payRes.body.booking.paidAmount).toBe(200000);
    expect(payRes.body.booking.paymentStatus).toBe('paid');
  });

  it('should update paymentStatus to partially_paid when partial', async () => {
    const room = await Room.create({
      roomNumber: '302',
      type: 'ekonom',
      floor: 3,
      pricePerNight: 400000,
      status: 'available',
    });

    const token = generateToken();
    const checkInRes = await request(app)
      .post('/api/bookings/check-in')
      .set('Authorization', `Bearer ${token}`)
      .send({
        roomId: room._id,
        guestDetails: {
          historyNumber: 'PAY-002',
          fullName: 'Qisman Tolov',
          phone: '+998901234567',
          maritalStatus: 'single',
          country: 'Uzbekistan',
          gender: 'male',
        },
        checkInDate: new Date().toISOString(),
        checkOutDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
        paymentMethod: 'cash',
        paidAmount: 0,
      });

    const bookingId = checkInRes.body.booking._id;

    const payRes = await request(app)
      .post(`/api/bookings/${bookingId}/payment`)
      .set('Authorization', `Bearer ${token}`)
      .send({ amount: 100000, paymentMethod: 'cash' });

    expect(payRes.status).toBe(200);
    expect(payRes.body.booking.paymentStatus).toBe('partially_paid');
  });
});

// ========================
// ODAM O'CHIRISH TESTLAR
// ========================
describe('Booking API - Remove Members', () => {
  it('should remove family member and update room occupiedBeds', async () => {
    const room = await Room.create({
      roomNumber: '401',
      type: 'lyuks',
      floor: 4,
      pricePerNight: 300000,
      status: 'available',
    });

    const token = generateToken();
    const checkInRes = await request(app)
      .post('/api/bookings/check-in')
      .set('Authorization', `Bearer ${token}`)
      .send({
        roomId: room._id,
        guestDetails: {
          historyNumber: 'REM-001',
          fullName: 'Bosh Mehmon',
          phone: '+998901234567',
          maritalStatus: 'single',
          country: 'Uzbekistan',
          gender: 'male',
          familyMembers: [
            { historyNumber: 'REM-002', fullName: 'Hamroh Biri', gender: 'female' },
            { historyNumber: 'REM-003', fullName: 'Hamroh Ikki', gender: 'male' },
          ],
        },
        checkInDate: new Date().toISOString(),
        checkOutDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        paymentMethod: 'cash',
        paidAmount: 0,
      });

    expect(checkInRes.status).toBe(201);
    const bookingId = checkInRes.body.booking._id;

    // Birinchi hamrohni olib tashlash
    const removeRes = await request(app)
      .post(`/api/bookings/${bookingId}/remove-family`)
      .set('Authorization', `Bearer ${token}`)
      .send({ memberIndex: 0 });

    expect(removeRes.status).toBe(200);

    // Xonada 1 ta kam bo'lishi kerak
    const updatedRoom = await Room.findById(room._id);
    expect(updatedRoom?.occupiedBeds).toBe(2); // 3 - 1 = 2

    // Booking da ham 1 ta ham kamayishi kerak
    const updatedBooking = await Booking.findById(bookingId);
    expect(updatedBooking?.guestDetails.familyMembers?.length).toBe(1);
  });

  it('should not remove main guest if they are the only person', async () => {
    const room = await Room.create({
      roomNumber: '402',
      type: 'ekonom',
      floor: 4,
      pricePerNight: 200000,
      status: 'available',
    });

    const token = generateToken();
    const checkInRes = await request(app)
      .post('/api/bookings/check-in')
      .set('Authorization', `Bearer ${token}`)
      .send({
        roomId: room._id,
        guestDetails: {
          historyNumber: 'SOLO-001',
          fullName: 'Yagona Mehmon',
          phone: '+998901234567',
          maritalStatus: 'single',
          country: 'Uzbekistan',
          gender: 'male',
        },
        checkInDate: new Date().toISOString(),
        checkOutDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        paymentMethod: 'cash',
        paidAmount: 0,
      });

    const bookingId = checkInRes.body.booking._id;

    const removeRes = await request(app)
      .post(`/api/bookings/${bookingId}/remove-main-guest`)
      .set('Authorization', `Bearer ${token}`)
      .send({});

    expect(removeRes.status).toBe(400);
    expect(removeRes.body.message).toContain('yagona mehmon');
  });

  it('should promote family member when main guest is removed', async () => {
    const room = await Room.create({
      roomNumber: '403',
      type: 'ekonom',
      floor: 4,
      pricePerNight: 200000,
      status: 'available',
    });

    const token = generateToken();
    const checkInRes = await request(app)
      .post('/api/bookings/check-in')
      .set('Authorization', `Bearer ${token}`)
      .send({
        roomId: room._id,
        guestDetails: {
          historyNumber: 'PROM-001',
          fullName: 'Asosiy Mehmon',
          phone: '+998901234567',
          maritalStatus: 'single',
          country: 'Uzbekistan',
          gender: 'male',
          familyMembers: [
            { historyNumber: 'PROM-002', fullName: 'Yangi Bosh', gender: 'female' },
          ],
        },
        checkInDate: new Date().toISOString(),
        checkOutDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(),
        paymentMethod: 'cash',
        paidAmount: 0,
      });

    const bookingId = checkInRes.body.booking._id;

    const removeRes = await request(app)
      .post(`/api/bookings/${bookingId}/remove-main-guest`)
      .set('Authorization', `Bearer ${token}`)
      .send({});

    expect(removeRes.status).toBe(200);

    const updatedBooking = await Booking.findById(bookingId);
    // Family member 'Yangi Bosh' asosiy mehmon bo'lishi kerak
    expect(updatedBooking?.guestDetails.fullName).toBe('Yangi Bosh');
    // Family members bo'sh bo'lishi kerak
    expect(updatedBooking?.guestDetails.familyMembers?.length).toBe(0);

    // Xona occupiedBeds 1 ta kamayishi kerak (2 - 1 = 1)
    const updatedRoom = await Room.findById(room._id);
    expect(updatedRoom?.occupiedBeds).toBe(1);
  });
});

// ========================
// FREEZE / RESUME TESTLAR
// ========================
describe('Booking API - Freeze & Resume', () => {
  it('should freeze booking and set room to cleaning', async () => {
    const room = await Room.create({
      roomNumber: '501',
      type: 'ekonom',
      floor: 5,
      pricePerNight: 200000,
      status: 'available',
    });

    const token = generateToken();
    const checkInRes = await request(app)
      .post('/api/bookings/check-in')
      .set('Authorization', `Bearer ${token}`)
      .send({
        roomId: room._id,
        guestDetails: {
          historyNumber: 'FRZ-001',
          fullName: 'Muzlatish Testi',
          phone: '+998901234567',
          maritalStatus: 'single',
          country: 'Uzbekistan',
          gender: 'male',
        },
        checkInDate: new Date().toISOString(),
        checkOutDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
        paymentMethod: 'cash',
        paidAmount: 600000,
      });

    const bookingId = checkInRes.body.booking._id;

    const freezeRes = await request(app)
      .post(`/api/bookings/${bookingId}/freeze`)
      .set('Authorization', `Bearer ${token}`)
      .send({});

    expect(freezeRes.status).toBe(200);
    expect(freezeRes.body.booking.status).toBe('frozen');

    const updatedRoom = await Room.findById(room._id);
    expect(updatedRoom?.status).toBe('cleaning');
  });

  it('should resume frozen booking with new room', async () => {
    const room1 = await Room.create({
      roomNumber: '502',
      type: 'ekonom',
      floor: 5,
      pricePerNight: 200000,
      status: 'available',
    });

    const room2 = await Room.create({
      roomNumber: '503',
      type: 'ekonom',
      floor: 5,
      pricePerNight: 200000,
      status: 'available',
    });

    const token = generateToken();

    // Check-in room1 ga
    const checkInRes = await request(app)
      .post('/api/bookings/check-in')
      .set('Authorization', `Bearer ${token}`)
      .send({
        roomId: room1._id,
        guestDetails: {
          historyNumber: 'RSM-001',
          fullName: 'Davom Etish',
          phone: '+998901234567',
          maritalStatus: 'single',
          country: 'Uzbekistan',
          gender: 'male',
        },
        checkInDate: new Date().toISOString(),
        checkOutDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        paymentMethod: 'cash',
        paidAmount: 600000,
      });

    const bookingId = checkInRes.body.booking._id;

    // Freeze
    await request(app)
      .post(`/api/bookings/${bookingId}/freeze`)
      .set('Authorization', `Bearer ${token}`)
      .send({});

    // Resume room2 ga
    const resumeRes = await request(app)
      .post(`/api/bookings/${bookingId}/resume`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        roomId: room2._id,
        checkOutDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
      });

    expect(resumeRes.status).toBe(200);
    expect(resumeRes.body.booking.status).toBe('active');

    const updatedRoom2 = await Room.findById(room2._id);
    expect(updatedRoom2?.status).toBe('booked');
  });
});

// ========================
// BOOKING O'CHIRISH TESTLAR
// ========================
describe('Booking API - Delete Booking', () => {
  it('should delete booking and free the room', async () => {
    const room = await Room.create({
      roomNumber: '601',
      type: 'ekonom',
      floor: 6,
      pricePerNight: 200000,
      status: 'available',
    });

    const token = generateToken();
    const checkInRes = await request(app)
      .post('/api/bookings/check-in')
      .set('Authorization', `Bearer ${token}`)
      .send({
        roomId: room._id,
        guestDetails: {
          historyNumber: 'DEL-001',
          fullName: "O'chirish Testi",
          phone: '+998901234567',
          maritalStatus: 'single',
          country: 'Uzbekistan',
          gender: 'male',
        },
        checkInDate: new Date().toISOString(),
        checkOutDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        paymentMethod: 'cash',
        paidAmount: 0,
      });

    const bookingId = checkInRes.body.booking._id;

    const deleteRes = await request(app)
      .delete(`/api/bookings/${bookingId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(deleteRes.status).toBe(200);

    const deletedBooking = await Booking.findById(bookingId);
    expect(deletedBooking).toBeNull();
  });

  it('should return 404 for non-existent booking', async () => {
    const token = generateToken();
    const fakeId = '000000000000000000000000';

    const res = await request(app)
      .delete(`/api/bookings/${fakeId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
  });
});

// ========================
// BOOKING YANGILASH TESTLAR
// ========================
describe('Booking API - Update Booking', () => {
  it('should update guest details', async () => {
    const room = await Room.create({
      roomNumber: '701',
      type: 'ekonom',
      floor: 7,
      pricePerNight: 200000,
      status: 'available',
    });

    const token = generateToken();
    const checkInRes = await request(app)
      .post('/api/bookings/check-in')
      .set('Authorization', `Bearer ${token}`)
      .send({
        roomId: room._id,
        guestDetails: {
          historyNumber: 'UPD-001',
          fullName: 'Dastlabki Ism',
          phone: '+998901234567',
          maritalStatus: 'single',
          country: 'Uzbekistan',
          gender: 'male',
        },
        checkInDate: new Date().toISOString(),
        checkOutDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        paymentMethod: 'cash',
        paidAmount: 0,
      });

    const bookingId = checkInRes.body.booking._id;

    const updateRes = await request(app)
      .put(`/api/bookings/${bookingId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        guestDetails: {
          fullName: 'Yangilangan Ism',
          phone: '+998991234567',
        },
      });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.booking.guestDetails.fullName).toBe('Yangilangan Ism');
    expect(updateRes.body.booking.guestDetails.phone).toBe('+998991234567');
  });
});
