import express from 'express';
import cors from 'cors';
import http from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import path from 'path';

import connectDB from './config/db';
import { setupSocket } from './socket';

// Routes
import authRoutes from './routes/auth.routes';
import roomRoutes from './routes/room.routes';
import bookingRoutes from './routes/booking.routes';
import transactionRoutes from './routes/transaction.routes';
import dashboardRoutes from './routes/dashboard.routes';
import staffRoutes from './routes/staff.routes';
import uploadRoutes from './routes/upload.routes';
import reportRoutes from './routes/report.routes';
import chatRoutes from './routes/chat.routes';
import reservationRoutes from './routes/reservation.routes';

dotenv.config();

const app = express();
const server = http.createServer(app);

// CORS origins - bir nechta URL ni qo'llab-quvvatlash (vergul bilan ajratilgan)
const getAllowedOrigins = (): string | string[] => {
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
  // Vergul bilan ajratilgan bir nechta URL bo'lishi mumkin
  if (clientUrl.includes(',')) {
    return clientUrl.split(',').map((u) => u.trim());
  }
  return clientUrl;
};

const allowedOrigins = getAllowedOrigins();

// Socket.io
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Socket.io'ni app'ga saqlash (controllerlarda ishlatish uchun)
app.set('io', io);
setupSocket(io);

// Middleware
app.use(cors({
  origin: allowedOrigins,
  credentials: true,
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Uploads static
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/reservations', reservationRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', message: 'Sanatory CRM Server ishlayapti! 🏨' });
});

// Error handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Server xatosi:', err);
  res.status(err.status || 500).json({
    message: err.message || 'Server xatosi',
  });
});

export { app, server };

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await connectDB();
  server.listen(PORT, () => {
    console.log(`\n🏨 Sanatory CRM Server ishga tushdi!`);
    console.log(`📡 Port: ${PORT}`);
    console.log(`🌐 URL: http://localhost:${PORT}`);
    console.log(`🔌 Socket.io: ulangan`);
    console.log(`📦 API: http://localhost:${PORT}/api\n`);
  });
};

if (process.env.NODE_ENV !== 'test') {
  startServer();
}
