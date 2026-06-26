import { Router } from 'express';
import { getDashboardStats, getRevenueChart, getOccupancyChart } from '../controllers/dashboard.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/stats', authorize('admin', 'reception'), getDashboardStats);
router.get('/revenue-chart', authorize('admin'), getRevenueChart);
router.get('/occupancy', authorize('admin'), getOccupancyChart);

export default router;
