import { Router } from 'express';
import { getAllTransactions, createTransaction, getTransactionSummary, deleteTransaction, updateTransaction } from '../controllers/transaction.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);
router.use(authorize('admin'));

router.get('/', getAllTransactions);
router.get('/summary', getTransactionSummary);
router.post('/', createTransaction);
router.delete('/:id', deleteTransaction);
router.put('/:id', updateTransaction);

export default router;
