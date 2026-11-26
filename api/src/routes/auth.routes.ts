import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { UserRole, DoctorStatus, SubscriptionStatus } from '@prisma/client';
import { authenticateToken, JWT_SECRET } from '../middleware/auth.middleware';
import { getUploadDirectory, getFileUrl } from '../lib/storage';

const router = Router();
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

const avatarUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, getUploadDirectory()),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname) || '.jpg';
      cb(null, `avatar_${uuidv4()}${ext}`);
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp/;
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.test(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files (jpg, png, webp) are allowed for profile pictures.'));
    }
  },
});

// Brute-force protection: track failed login attempts per IP
const loginAttempts = new Map<string, { count: number; resetAt: number }>();
const MAX_LOGIN_ATTEMPTS = 15;
const LOGIN_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

const patientRegisterSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  phoneNumber: z.string().min(9, 'Valid Ghanaian phone number required'),
  email: z.string().email().optional().or(z.literal('')),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const doctorRegisterSchema = z.object({
  fullName: z.string().min(2),
  phoneNumber: z.string().min(9),
  email: z.string().email(),
  password: z.string().min(6),
  specialty: z.string().min(2),
  subSpecialty: z.string().optional(),
  licenseNumber: z.string().min(3, 'Medical license number is required'),
  hospitalAffiliation: z.string().optional(),
  yearsOfExperience: z.number().nonnegative().default(0),
  bio: z.string().optional(),
  consultationFee: z.number().nonnegative().default(0.0),
  documentUrls: z.array(z.string()).default([]),
});

const loginSchema = z.object({
  identifier: z.string().min(3, 'Phone number or email required'),
  password: z.string().min(1, 'Password required'),
});

/**
 * Patient Registration with automatic 90-day (3-Month) Free Trial
 */
router.post('/register-patient', async (req: Request, res: Response) => {
  try {
    const data = patientRegisterSchema.parse(req.body);

    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { phoneNumber: data.phoneNumber },
          ...(data.email ? [{ email: data.email }] : []),
        ],
      },
    });

    if (existingUser) {
      res.status(409).json({ success: false, message: 'Phone number or email is already registered.' });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(data.password, salt);

    const trialStartsAt = new Date();
    const trialEndsAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000); // 90 days from now

    const newUser = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          role: UserRole.PATIENT,
          fullName: data.fullName,
          phoneNumber: data.phoneNumber,
          email: data.email || null,
          passwordHash,
        },
      });

      await tx.subscription.create({
        data: {
          patientId: user.id,
          status: SubscriptionStatus.TRIAL,
          trialStartsAt,
          trialEndsAt,
          amountGhs: 10.0,
        },
      });

      return user;
    });

    const token = jwt.sign({ id: newUser.id, role: newUser.role }, JWT_SECRET, {
      expiresIn: '7d',
    });

    res.status(201).json({
      success: true,
      message: 'Account created successfully with a 3-month free trial!',
      token,
      user: {
        id: newUser.id,
        role: newUser.role,
        fullName: newUser.fullName,
        phoneNumber: newUser.phoneNumber,
        email: newUser.email,
        trialEndsAt,
      },
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, errors: error.errors });
      return;
    }
    console.error('[Register Patient Error]', error);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
});

/**
 * Doctor Registration with Credentials (Defaults to PENDING status)
 */
router.post('/register-doctor', async (req: Request, res: Response) => {
  try {
    const data = doctorRegisterSchema.parse(req.body);

    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ phoneNumber: data.phoneNumber }, { email: data.email }],
      },
    });

    if (existingUser) {
      res.status(409).json({ success: false, message: 'Phone number or email is already registered.' });
      return;
    }

    const existingLicense = await prisma.doctorProfile.findUnique({
      where: { licenseNumber: data.licenseNumber },
    });

    if (existingLicense) {
      res.status(409).json({ success: false, message: 'This medical license number has already been registered.' });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(data.password, salt);

    const doctorUser = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          role: UserRole.DOCTOR,
          fullName: data.fullName,
          phoneNumber: data.phoneNumber,
          email: data.email,
          passwordHash,
        },
      });

      await tx.doctorProfile.create({
        data: {
          userId: user.id,
          specialty: data.specialty,
          subSpecialty: data.subSpecialty,
          licenseNumber: data.licenseNumber,
          hospitalAffiliation: data.hospitalAffiliation,
          yearsOfExperience: data.yearsOfExperience,
          bio: data.bio,
          consultationFee: data.consultationFee,
          documentUrls: data.documentUrls,
          verificationStatus: DoctorStatus.PENDING,
        },
      });

      return user;
    });

    const token = jwt.sign({ id: doctorUser.id, role: doctorUser.role }, JWT_SECRET, {
      expiresIn: '7d',
    });

    res.status(201).json({
      success: true,
      message: 'Doctor registration submitted successfully! Your credentials are now pending verification by the Super Admin.',
      token,
      verificationStatus: DoctorStatus.PENDING,
      user: {
        id: doctorUser.id,
        role: doctorUser.role,
        fullName: doctorUser.fullName,
        email: doctorUser.email,
        phoneNumber: doctorUser.phoneNumber,
      },
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, errors: error.errors });
      return;
    }
    console.error('[Register Doctor Error]', error);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
});

/**
 * Universal Login (Patient, Doctor, Super Admin)
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
    const nowMs = Date.now();
    const attempt = loginAttempts.get(clientIp);
    if (attempt && nowMs < attempt.resetAt && attempt.count >= MAX_LOGIN_ATTEMPTS) {
      res.status(429).json({
        success: false,
        message: 'Too many failed login attempts. Please wait 15 minutes before trying again.',
      });
      return;
    }

    const { identifier, password } = loginSchema.parse(req.body);

    const user = await prisma.user.findFirst({
      where: {
        OR: [{ phoneNumber: identifier }, { email: identifier }],
      },
      include: {
        doctorProfile: true,
        subscription: true,
      },
    });

    if (!user) {
      const prev = loginAttempts.get(clientIp);
      loginAttempts.set(clientIp, {
        count: prev && nowMs < prev.resetAt ? prev.count + 1 : 1,
        resetAt: nowMs + LOGIN_WINDOW_MS,
      });
      res.status(401).json({ success: false, message: 'Invalid phone/email or password.' });
      return;
    }

    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      const prev = loginAttempts.get(clientIp);
      loginAttempts.set(clientIp, {
        count: prev && nowMs < prev.resetAt ? prev.count + 1 : 1,
        resetAt: nowMs + LOGIN_WINDOW_MS,
      });
      res.status(401).json({ success: false, message: 'Invalid phone/email or password.' });
      return;
    }

    // Clear failed attempts on successful login
    loginAttempts.delete(clientIp);

    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, {
      expiresIn: '7d',
    });

    let extraData: Record<string, any> = {};

    if (user.role === UserRole.DOCTOR && user.doctorProfile) {
      extraData.doctorVerification = {
        status: user.doctorProfile.verificationStatus,
        rejectionReason: user.doctorProfile.rejectionReason,
        specialty: user.doctorProfile.specialty,
        licenseNumber: user.doctorProfile.licenseNumber,
      };
    } else if (user.role === UserRole.PATIENT && user.subscription) {
      const now = new Date();
      const isTrial = user.subscription.status === SubscriptionStatus.TRIAL;
      const trialDaysRemaining = Math.max(
        0,
        Math.ceil((user.subscription.trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      );

      extraData.subscription = {
        status: user.subscription.status,
        trialEndsAt: user.subscription.trialEndsAt,
        trialDaysRemaining,
        isAccessAllowed: isTrial ? now <= user.subscription.trialEndsAt : user.subscription.status === SubscriptionStatus.ACTIVE,
      };
    }

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        role: user.role,
        fullName: user.fullName,
        phoneNumber: user.phoneNumber,
        email: user.email,
        avatarUrl: user.avatarUrl,
      },
      ...extraData,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, errors: error.errors });
      return;
    }
    console.error('[Login Error]', error);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
});

/**
 * Get Current User Profile & Context
 */
router.get('/me', authenticateToken, async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      include: {
        doctorProfile: true,
        subscription: true,
      },
    });

    if (!user) {
      res.status(404).json({ success: false, message: 'User not found.' });
      return;
    }

    let extraData: Record<string, any> = {};

    if (user.role === UserRole.DOCTOR && user.doctorProfile) {
      extraData.doctorVerification = {
        status: user.doctorProfile.verificationStatus,
        rejectionReason: user.doctorProfile.rejectionReason,
        specialty: user.doctorProfile.specialty,
        licenseNumber: user.doctorProfile.licenseNumber,
        hospitalAffiliation: user.doctorProfile.hospitalAffiliation,
        yearsOfExperience: user.doctorProfile.yearsOfExperience,
        bio: user.doctorProfile.bio,
        consultationFee: user.doctorProfile.consultationFee,
        documentUrls: user.doctorProfile.documentUrls,
      };
    } else if (user.role === UserRole.PATIENT && user.subscription) {
      const now = new Date();
      const isTrial = user.subscription.status === SubscriptionStatus.TRIAL;
      const trialDaysRemaining = Math.max(
        0,
        Math.ceil((user.subscription.trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      );

      extraData.subscription = {
        status: user.subscription.status,
        trialEndsAt: user.subscription.trialEndsAt,
        trialDaysRemaining,
        isAccessAllowed: isTrial ? now <= user.subscription.trialEndsAt : user.subscription.status === SubscriptionStatus.ACTIVE,
      };
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        role: user.role,
        fullName: user.fullName,
        phoneNumber: user.phoneNumber,
        email: user.email,
        avatarUrl: user.avatarUrl,
        fcmToken: user.fcmToken,
      },
      ...extraData,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
});

const updateProfileSchema = z.object({
  fullName: z.string().min(2).optional(),
  email: z.string().email().optional().or(z.literal('')),
  phoneNumber: z.string().min(9).optional(),
});

/**
 * Update Current User Profile
 */
router.put('/profile', authenticateToken, async (req: Request, res: Response) => {
  try {
    const data = updateProfileSchema.parse(req.body);

    const updated = await prisma.user.update({
      where: { id: req.user!.id },
      data: {
        ...(data.fullName ? { fullName: data.fullName } : {}),
        ...(data.email !== undefined ? { email: data.email || null } : {}),
        ...(data.phoneNumber ? { phoneNumber: data.phoneNumber } : {}),
      },
    });

    res.json({
      success: true,
      message: 'Profile updated successfully.',
      user: {
        id: updated.id,
        role: updated.role,
        fullName: updated.fullName,
        phoneNumber: updated.phoneNumber,
        email: updated.email,
        avatarUrl: updated.avatarUrl,
      },
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, errors: error.errors });
      return;
    }
    res.status(500).json({ success: false, message: 'Failed to update profile.' });
  }
});

/**
 * Upload Profile Picture (Patient or Doctor)
 */
router.post(
  '/avatar',
  authenticateToken,
  avatarUpload.single('avatar'),
  async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        res.status(400).json({ success: false, message: 'No profile image was uploaded.' });
        return;
      }

      const avatarUrl = getFileUrl(req.file.filename, req.get('host'));

      const updated = await prisma.user.update({
        where: { id: req.user!.id },
        data: { avatarUrl },
        select: {
          id: true,
          role: true,
          fullName: true,
          phoneNumber: true,
          email: true,
          avatarUrl: true,
        },
      });

      res.json({
        success: true,
        message: 'Profile picture updated successfully.',
        avatarUrl,
        user: updated,
      });
    } catch (error: any) {
      console.error('[Avatar Upload Error]', error);
      res.status(500).json({ success: false, message: error.message || 'Failed to upload avatar.' });
    }
  }
);

export default router;
