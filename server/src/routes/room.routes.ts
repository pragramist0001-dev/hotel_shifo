import { Router } from 'express';
import { getAllRooms, getRoomById, createRoom, updateRoom, updateRoomStatus, deleteRoom } from '../controllers/room.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/', getAllRooms);
router.get('/:id', getRoomById);
router.post('/', authorize('admin'), createRoom);
router.put('/:id', authorize('admin'), updateRoom);
router.patch('/:id/status', updateRoomStatus);
router.delete('/:id', authorize('admin'), deleteRoom);

export default router;
