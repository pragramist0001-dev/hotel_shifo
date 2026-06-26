import express from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { getMessages, sendMessage, updateMessage, deleteMessage, getUsers } from '../controllers/chat.controller';

const router = express.Router();

router.use(authenticate);

router.get('/users', getUsers);
router.get('/', getMessages);
router.post('/', sendMessage);
router.put('/:id', updateMessage);
router.delete('/:id', deleteMessage);

export default router;
