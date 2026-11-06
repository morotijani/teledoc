import { Request, Response, NextFunction } from 'express';
import { UserRole, DoctorStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';

export function requireRole(allowedRoles: UserRole[]) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Unauthorized: User not authenticated.' });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: `Forbidden: Requires one of [${allowedRoles.join(', ')}] roles.`,
      });
      return;
    }

    // Special validation for DOCTOR role: must be APPROVED by admin
    if (req.user.role === UserRole.DOCTOR) {
      const doctorProfile = await prisma.doctorProfile.findUnique({
        where: { userId: req.user.id },
        select: { verificationStatus: true, rejectionReason: true },
      });

      if (!doctorProfile) {
        res.status(403).json({
          success: false,
          message: 'Doctor profile not found. Please complete profile registration.',
        });
        return;
      }

      if (doctorProfile.verificationStatus === DoctorStatus.PENDING) {
        res.status(403).json({
          success: false,
          code: 'DOCTOR_PENDING_APPROVAL',
          message: 'Your medical credentials are currently pending review and verification by the Super Admin.',
        });
        return;
      }

      if (doctorProfile.verificationStatus === DoctorStatus.REJECTED) {
        res.status(403).json({
          success: false,
          code: 'DOCTOR_REJECTED',
          message: `Your medical registration was rejected: ${doctorProfile.rejectionReason || 'Invalid credentials'}.`,
        });
        return;
      }

      if (doctorProfile.verificationStatus === DoctorStatus.SUSPENDED) {
        res.status(403).json({
          success: false,
          code: 'DOCTOR_SUSPENDED',
          message: 'Your doctor account has been suspended. Please contact support.',
        });
        return;
      }
    }

    next();
  };
}
