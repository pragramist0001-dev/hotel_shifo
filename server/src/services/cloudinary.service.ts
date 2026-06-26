import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';
import path from 'path';

// Cloudinary configure (agar credentials bo'lsa)
if (process.env.CLOUDINARY_CLOUD_NAME) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

export const uploadToCloudinary = async (filePath: string, folder: string = 'sanatory_crm'): Promise<string> => {
  // Agar Cloudinary credentials bo'lsa, cloud'ga yuklash
  if (process.env.CLOUDINARY_CLOUD_NAME) {
    try {
      const result = await cloudinary.uploader.upload(filePath, {
        folder,
        resource_type: 'image',
        transformation: [{ width: 1200, height: 1200, crop: 'limit' }, { quality: 'auto' }],
      });
      // Local faylni o'chirish
      fs.unlinkSync(filePath);
      return result.secure_url;
    } catch (error) {
      console.error('Cloudinary upload xatosi:', error);
      throw error;
    }
  }

  // Cloudinary yo'q bo'lsa, local URL qaytarish
  const filename = path.basename(filePath);
  return `/uploads/${filename}`;
};

export const uploadBase64ToCloudinary = async (base64Data: string, folder: string = 'sanatory_crm'): Promise<string> => {
  if (process.env.CLOUDINARY_CLOUD_NAME) {
    try {
      const result = await cloudinary.uploader.upload(base64Data, {
        folder,
        resource_type: 'image',
        transformation: [{ width: 1200, height: 1200, crop: 'limit' }, { quality: 'auto' }],
      });
      return result.secure_url;
    } catch (error) {
      console.error('Cloudinary base64 upload xatosi:', error);
      throw error;
    }
  }

  // Local fallback: base64'ni faylga yozish
  const uploadsDir = path.join(__dirname, '../../uploads');
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

  const filename = `webcam-${Date.now()}.png`;
  const filePath = path.join(uploadsDir, filename);

  const base64Image = base64Data.replace(/^data:image\/\w+;base64,/, '');
  fs.writeFileSync(filePath, Buffer.from(base64Image, 'base64'));

  return `/uploads/${filename}`;
};
