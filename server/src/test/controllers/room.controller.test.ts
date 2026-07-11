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
// XONA YARATISH
// ========================
describe('Room API - Create', () => {
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
    expect(res.body.room.status).toBe('available');
  });

  it('should create room with all optional fields', async () => {
    const token = generateToken();
    const res = await request(app)
      .post('/api/rooms')
      .set('Authorization', `Bearer ${token}`)
      .send({
        roomNumber: '102',
        type: 'lyuks',
        floor: 3,
        pricePerNight: 500000,
        capacity: 4,
        description: 'Ajoyib lyuks xona',
        amenities: ['TV', 'Konditsioner'],
      });

    expect(res.status).toBe(201);
    expect(res.body.room.type).toBe('lyuks');
    expect(res.body.room.capacity).toBe(4);
    expect(res.body.room.description).toBe('Ajoyib lyuks xona');
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

  it('should reject unauthenticated request', async () => {
    const res = await request(app)
      .post('/api/rooms')
      .send({
        roomNumber: '103',
        type: 'ekonom',
        floor: 1,
        pricePerNight: 100000,
      });

    expect(res.status).toBe(401);
  });
});

// ========================
// XONA RO'YXATI
// ========================
describe('Room API - Get All', () => {
  it('should return all rooms', async () => {
    await Room.create([
      { roomNumber: '201', type: 'ekonom', floor: 2, pricePerNight: 100000 },
      { roomNumber: '202', type: 'lyuks', floor: 2, pricePerNight: 300000 },
      { roomNumber: '203', type: 'standartplus', floor: 2, pricePerNight: 200000 },
    ]);

    const token = generateToken();
    const res = await request(app)
      .get('/api/rooms')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.rooms.length).toBe(3);
    expect(res.body.total).toBe(3);
  });

  it('should filter rooms by status', async () => {
    await Room.create([
      { roomNumber: '301', type: 'ekonom', floor: 3, pricePerNight: 100000, status: 'available' },
      { roomNumber: '302', type: 'lyuks', floor: 3, pricePerNight: 300000, status: 'booked' },
      { roomNumber: '303', type: 'ekonom', floor: 3, pricePerNight: 100000, status: 'available' },
    ]);

    const token = generateToken();
    const res = await request(app)
      .get('/api/rooms?status=available')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.rooms.length).toBe(2);
    expect(res.body.rooms.every((r: any) => r.status === 'available')).toBe(true);
  });

  it('should filter rooms by floor', async () => {
    await Room.create([
      { roomNumber: '401', type: 'ekonom', floor: 1, pricePerNight: 100000 },
      { roomNumber: '402', type: 'ekonom', floor: 2, pricePerNight: 100000 },
      { roomNumber: '403', type: 'ekonom', floor: 1, pricePerNight: 100000 },
    ]);

    const token = generateToken();
    const res = await request(app)
      .get('/api/rooms?floor=1')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.rooms.length).toBe(2);
    expect(res.body.rooms.every((r: any) => r.floor === 1)).toBe(true);
  });
});

// ========================
// XONA YANGILASH
// ========================
describe('Room API - Update', () => {
  it('should update room price and description', async () => {
    const room = await Room.create({
      roomNumber: '501',
      type: 'ekonom',
      floor: 5,
      pricePerNight: 100000,
    });

    const token = generateToken();
    const res = await request(app)
      .put(`/api/rooms/${room._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        pricePerNight: 150000,
        description: 'Yangilangan tavsif',
      });

    expect(res.status).toBe(200);
    expect(res.body.room.pricePerNight).toBe(150000);
    expect(res.body.room.description).toBe('Yangilangan tavsif');
  });

  it('should update room status to cleaning', async () => {
    const room = await Room.create({
      roomNumber: '502',
      type: 'ekonom',
      floor: 5,
      pricePerNight: 100000,
      status: 'available',
    });

    const token = generateToken();
    const res = await request(app)
      .put(`/api/rooms/${room._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'cleaning' });

    expect(res.status).toBe(200);
    expect(res.body.room.status).toBe('cleaning');
  });

  it('should not allow setting booked status manually', async () => {
    const room = await Room.create({
      roomNumber: '503',
      type: 'ekonom',
      floor: 5,
      pricePerNight: 100000,
    });

    const token = generateToken();
    const res = await request(app)
      .put(`/api/rooms/${room._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'booked' });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain("qo'lda o'zgartirib bo'lmaydi");
  });

  it('should not allow duplicate room number when updating', async () => {
    await Room.create({ roomNumber: '601', type: 'ekonom', floor: 6, pricePerNight: 100000 });
    const room2 = await Room.create({ roomNumber: '602', type: 'ekonom', floor: 6, pricePerNight: 100000 });

    const token = generateToken();
    const res = await request(app)
      .put(`/api/rooms/${room2._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ roomNumber: '601' }); // allaqachon mavjud raqam

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('allaqachon mavjud');
  });
});

// ========================
// XONA STATUS YANGILASH
// ========================
describe('Room API - Update Status', () => {
  it('should force-set room to available', async () => {
    const room = await Room.create({
      roomNumber: '701',
      type: 'ekonom',
      floor: 7,
      pricePerNight: 100000,
      status: 'booked',
    });

    const token = generateToken();
    const res = await request(app)
      .patch(`/api/rooms/${room._id}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'available' });

    expect(res.status).toBe(200);

    const updatedRoom = await Room.findById(room._id);
    expect(updatedRoom?.status).toBe('available');
  });

  it('should reject invalid status values', async () => {
    const room = await Room.create({
      roomNumber: '702',
      type: 'ekonom',
      floor: 7,
      pricePerNight: 100000,
    });

    const token = generateToken();
    const res = await request(app)
      .patch(`/api/rooms/${room._id}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'invalid_status' });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('Yaroqsiz status');
  });
});

// ========================
// XONA O'CHIRISH
// ========================
describe('Room API - Delete', () => {
  it('should delete an available room', async () => {
    const room = await Room.create({
      roomNumber: '801',
      type: 'ekonom',
      floor: 8,
      pricePerNight: 100000,
      status: 'available',
    });

    const token = generateToken();
    const res = await request(app)
      .delete(`/api/rooms/${room._id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    const deleted = await Room.findById(room._id);
    expect(deleted).toBeNull();
  });

  it('should not allow deleting a booked room', async () => {
    const room = await Room.create({
      roomNumber: '802',
      type: 'ekonom',
      floor: 8,
      pricePerNight: 100000,
      status: 'booked',
    });

    const token = generateToken();
    const res = await request(app)
      .delete(`/api/rooms/${room._id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(400);
    expect(res.body.message).toContain("Band xonani o'chirib bo'lmaydi");
  });

  it('should return 404 for non-existent room', async () => {
    const token = generateToken();
    const fakeId = '000000000000000000000000';
    const res = await request(app)
      .delete(`/api/rooms/${fakeId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
  });
});

// ========================
// XONA OLISH (BITTA)
// ========================
describe('Room API - Get By ID', () => {
  it('should return room by ID with booking info', async () => {
    const room = await Room.create({
      roomNumber: '901',
      type: 'lyuks',
      floor: 9,
      pricePerNight: 300000,
      status: 'available',
    });

    const token = generateToken();
    const res = await request(app)
      .get(`/api/rooms/${room._id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.room.roomNumber).toBe('901');
    expect(res.body.room.type).toBe('lyuks');
  });

  it('should return 404 for non-existent room', async () => {
    const token = generateToken();
    const fakeId = '000000000000000000000000';
    const res = await request(app)
      .get(`/api/rooms/${fakeId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
  });

  it('should include maintenanceDays for maintenance rooms', async () => {
    const room = await Room.create({
      roomNumber: '902',
      type: 'ekonom',
      floor: 9,
      pricePerNight: 100000,
      status: 'maintenance',
    });

    const token = generateToken();
    const res = await request(app)
      .get(`/api/rooms/${room._id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.maintenanceDays).toBeDefined();
    expect(typeof res.body.maintenanceDays).toBe('number');
  });
});
