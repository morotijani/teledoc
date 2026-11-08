import fs from 'fs';
import path from 'path';

const UPLOAD_DIR = path.resolve(process.cwd(), process.env.UPLOAD_DIR || './uploads');

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

export function getUploadDirectory(): string {
  return UPLOAD_DIR;
}

export function getFileUrl(filename: string, hostHeader?: string): string {
  if (process.env.BASE_URL) {
    return `${process.env.BASE_URL}/uploads/${filename}`;
  }
  const host = hostHeader || `localhost:${process.env.PORT || 5000}`;
  return `http://${host}/uploads/${filename}`;
}
