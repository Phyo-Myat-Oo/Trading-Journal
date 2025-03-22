import fs from 'fs';
import path from 'path';

export const ensureUploadDir = (): void => {
  const uploadDir = path.join(__dirname, '../../uploads');
  
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
}; 