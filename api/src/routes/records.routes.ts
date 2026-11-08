import { Router, Request, Response } from 'express';
import multer from 'multer';
import fs from 'fs';
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
      const { title, fileType, notes, targetPatientId, useSampleFile } = req.body;
      let filename = req.file?.filename;

      if (!filename && (useSampleFile === 'true' || useSampleFile === true)) {
        filename = `sample-lab-${uuidv4().slice(0, 8)}.pdf`;
        const samplePath = path.join(getUploadDirectory(), filename);
        const pdfText = `%PDF-1.4
1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj
3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj
4 0 obj << /Length 160 >> stream
BT /F1 16 Tf 50 720 Td (TeleDoc Ghana - Clinical Lab Report) Tj /F1 12 Tf 0 -30 Td (Document: ${(title || 'Lab Result').replace(/[()\\]/g, '')}) Tj 0 -20 Td (Notes: ${(notes || 'Within normal reference range').replace(/[()\\]/g, '')}) Tj ET
endstream endobj
5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000229 00000 n 
0000000441 00000 n 
trailer << /Size 6 /Root 1 0 R >>
startxref
509
%%EOF`;
        fs.writeFileSync(samplePath, pdfText);
      }

      if (!filename) {
        res.status(400).json({ success: false, message: 'No file was uploaded.' });
        return;
      }

      const patientId =
        req.user!.role === UserRole.DOCTOR && targetPatientId ? targetPatientId : req.user!.id;

      const fileUrl = getFileUrl(filename, req.get('host'));

      const record = await prisma.medicalRecord.create({
        data: {
          patientId,
          uploadedById: req.user!.id,
          title: title || req.file?.originalname || 'Clinical Document',
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

    // Security check: doctors must be APPROVED and have an appointment with this patient
    if (req.user!.role === UserRole.DOCTOR) {
      const [docProfile, hasAppointment] = await Promise.all([
        prisma.doctorProfile.findUnique({
          where: { userId: req.user!.id },
          select: { verificationStatus: true },
        }),
        prisma.appointment.findFirst({
          where: { doctorId: req.user!.id, patientId },
          select: { id: true },
        }),
      ]);

      if (docProfile?.verificationStatus !== 'APPROVED' || !hasAppointment) {
        res.status(403).json({
          success: false,
          message: 'Only approved doctors assigned to this patient may access their medical records.',
        });
        return;
      }
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
