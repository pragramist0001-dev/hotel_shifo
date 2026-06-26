import { Router } from 'express';
import { getAllStaff, createStaff, updateStaff, deleteStaff, getStaffLogs, getAllLogs } from '../controllers/staff.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);
router.use(authorize('admin'));

router.get('/', getAllStaff);
router.get('/logs', getAllLogs);
router.post('/', createStaff);
router.put('/:id', updateStaff);
router.delete('/:id', deleteStaff);
router.get('/:id/logs', getStaffLogs);

export default router;
