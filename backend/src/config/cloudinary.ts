import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Configure multer storage
export const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'trading-journal/trades',
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif'],
    transformation: [{ width: 1920, height: 1080, crop: 'limit' }],
  } as any, // Type assertion needed due to type mismatch in the library
});

export default cloudinary; 