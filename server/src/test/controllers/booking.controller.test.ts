import request from 'supertest';
import { app, server } from '../../app';
import { connectDB, closeDB, clearDB } from '../setup';
import Room from '../../models/Room';
import Booking from '../../models/Booking';
import User from '../../models/User';
import jwt from 'jsonwebtoken';

beforeAll(async () => {
  await connectDB();
});

afterAll(async () => {
  await closeDB();
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
        checkOutDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 nights
        paymentMethod: 'cash',
        paidAmount: 400000,
      });

    expect(res.status).toBe(201);
    expect(res.body.booking.totalPrice).toBe(400000); // 1 person * 2 nights * 200,000
    expect(res.body.booking.paymentStatus).toBe('paid');

    const updatedRoom = await Room.findById(room._id);
    expect(updatedRoom?.status).toBe('booked');
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
    expect(res.body.message).toContain('Turmush o\'rtog\'ining ismi majburiy');
  });
});
