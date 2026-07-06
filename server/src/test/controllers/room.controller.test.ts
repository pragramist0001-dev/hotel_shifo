import request from 'supertest';
import { app, server } from '../../app';
import { connectDB, closeDB, clearDB } from '../setup';
import Room from '../../models/Room';
import User from '../../models/User';
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

describe('Room API', () => {
  it('should create a new room successfully', async () => {
    const token = generateToken();
    const res = await request(app)
      .post('/api/rooms')
      .set('Authorization', `Bearer ${token}`)
      .send({
        roomNumber: '101',
        type: 'ekonom',
        floor: 1,
        pricePerNight: 100000,
      });


    expect(res.status).toBe(201);
    expect(res.body.room.roomNumber).toBe('101');
  });

  it('should not allow duplicate room numbers', async () => {
    await Room.create({
      roomNumber: '101',
      type: 'ekonom',
      floor: 1,
      pricePerNight: 100000,
    });

    const token = generateToken();
    const res = await request(app)
      .post('/api/rooms')
      .set('Authorization', `Bearer ${token}`)
      .send({
        roomNumber: '101',
        type: 'lyuks',
        floor: 1,
        pricePerNight: 150000,
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('allaqachon mavjud');
  });

  it('should not allow deleting a booked room', async () => {
    const room = await Room.create({
      roomNumber: '102',
      type: 'ekonom',
      floor: 1,
      pricePerNight: 100000,
      status: 'booked',
    });

    const token = generateToken();
    const res = await request(app)
      .delete(`/api/rooms/${room._id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('Band xonani o\'chirib bo\'lmaydi');
  });
});
