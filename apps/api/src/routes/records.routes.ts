import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../lib/prisma';
import { FileType, UserRole } from '@prisma/client';
import { authenticateToken } from '../middleware/auth.middleware';
import { getUploadDirectory, getFileUrl } from '../lib/storage';

const router = Router();

// Configure Multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, getUploadDirectory());
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueName = `${uuidv4()}${ext}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB max
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf|doc|docx/;
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.test(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only images (jpg, png) and documents (pdf, doc, docx) are allowed.'));
    }
  },
});

/**
 * Upload Lab Result or Medical Record
 */
router.post(
  '/upload',
  authenticateToken,
  upload.single('file'),
  async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        res.status(400).json({ success: false, message: 'No file was uploaded.' });
        return;
      }

      const { title, fileType, notes, targetPatientId } = req.body;
      const patientId =
        req.user!.role === UserRole.DOCTOR && targetPatientId ? targetPatientId : req.user!.id;

      const fileUrl = getFileUrl(req.file.filename);

      const record = await prisma.medicalRecord.create({
        data: {
          patientId,
          uploadedById: req.user!.id,
          title: title || req.file.originalname,
          fileType: (fileType as FileType) || FileType.LAB_RESULT,
          fileUrl,
          notes,
        },
      });

      res.status(201).json({
        success: true,
        message: 'Medical document uploaded successfully.',
        record,
      });
    } catch (error: any) {
      console.error('[Upload Record Error]', error);
      res.status(500).json({ success: false, message: error.message || 'Failed to upload document.' });
    }
  }
);

/**
 * Get Medical Records for a Patient
 */
router.get('/patient/:patientId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const patientId = String(req.params.patientId);

    // Security check: patients can only see their own records
    if (req.user!.role === UserRole.PATIENT && req.user!.id !== patientId) {
      res.status(403).json({ success: false, message: 'Unauthorized to view these records.' });
      return;
    }

    const records = await prisma.medicalRecord.findMany({
      where: { patientId },
      include: {
        uploadedBy: {
          select: { id: true, fullName: true, role: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      count: records.length,
      records,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to retrieve medical records.' });
  }
});

export default router;
