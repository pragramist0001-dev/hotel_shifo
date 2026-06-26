import { Router } from 'express';
import { uploadImage, uploadWebcamImage } from '../controllers/upload.controller';
import { authenticate } from '../middleware/auth.middleware';
import { upload } from '../middleware/upload.middleware';

const router = Router();

router.use(authenticate);

router.post('/image', upload.single('image'), uploadImage);
router.post('/webcam', uploadWebcamImage);

export default router;
