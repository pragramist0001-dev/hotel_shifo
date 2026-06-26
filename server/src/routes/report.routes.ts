import express from 'express';
import { createReport, getReports, updateReportStatus, getReportStats, updateReport, deleteReport } from '../controllers/report.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = express.Router();

router.route('/stats')
  .get(authenticate, getReportStats);

router.route('/')
  .get(authenticate, getReports)
  .post(authenticate, createReport);

router.route('/:id/status')
  .patch(authenticate, authorize('admin'), updateReportStatus);

router.route('/:id')
  .put(authenticate, updateReport)
  .delete(authenticate, deleteReport);

export default router;
