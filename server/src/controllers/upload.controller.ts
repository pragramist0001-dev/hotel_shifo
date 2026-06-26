import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { uploadToCloudinary, uploadBase64ToCloudinary } from '../services/cloudinary.service';

export const uploadImage = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ message: 'Rasm yuklanmadi.' });
      return;
    }

    const url = await uploadToCloudinary(req.file.path, 'sanatory_crm/documents');

    res.json({ message: 'Rasm muvaffaqiyatli yuklandi.', url });
  } catch (error) {
    console.error('Upload xatosi:', error);
    res.status(500).json({ message: 'Rasm yuklashda xatolik yuz berdi.' });
  }
};

export const uploadWebcamImage = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { image } = req.body;

    if (!image) {
      res.status(400).json({ message: 'Rasm ma\'lumotlari topilmadi.' });
      return;
    }

    const url = await uploadBase64ToCloudinary(image, 'sanatory_crm/webcam');

    res.json({ message: 'Webcam rasmi muvaffaqiyatli yuklandi.', url });
  } catch (error) {
    console.error('Webcam upload xatosi:', error);
    res.status(500).json({ message: 'Webcam rasmi yuklashda xatolik.' });
  }
};
