import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { UserRole, DoctorStatus } from '@prisma/client';
import { authenticateToken } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/rbac.middleware';
import { sendPushNotification } from '../lib/notifications';

const router = Router();

// Guard all admin routes with authentication and ADMIN role check
router.use(authenticateToken, requireRole([UserRole.ADMIN]));

/**
 * List doctors pending verification
 */
router.get('/doctors/pending', async (req: Request, res: Response) => {
  try {
    const pendingDoctors = await prisma.doctorProfile.findMany({
      where: { verificationStatus: DoctorStatus.PENDING },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phoneNumber: true,
            avatarUrl: true,
            createdAt: true,
          },
        },
      },
      orderBy: { user: { createdAt: 'desc' } },
    });

    res.json({
      success: true,
      count: pendingDoctors.length,
      doctors: pendingDoctors,
    });
  } catch (error) {
    console.error('[Admin Pending Doctors Error]', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve pending doctors.' });
  }
});

/**
 * List all doctors with optional status filter
 */
router.get('/doctors', async (req: Request, res: Response) => {
  try {
    const { status, specialty } = req.query;

    const doctors = await prisma.doctorProfile.findMany({
      where: {
        ...(status ? { verificationStatus: status as DoctorStatus } : {}),
        ...(specialty ? { specialty: { contains: String(specialty), mode: 'insensitive' } } : {}),
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phoneNumber: true,
            avatarUrl: true,
            createdAt: true,
          },
        },
        verifiedBy: {
          select: { fullName: true, email: true },
        },
      },
      orderBy: { user: { createdAt: 'desc' } },
    });

    res.json({
      success: true,
      count: doctors.length,
      doctors,
    });
  } catch (error) {
    console.error('[Admin All Doctors Error]', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve doctors.' });
  }
});

/**
 * Approve Doctor Credentials
 */
router.post('/doctors/:id/approve', async (req: Request, res: Response) => {
  try {
    const doctorProfileId = String(req.params.id);

    const doctorProfile = await prisma.doctorProfile.findUnique({
      where: { id: doctorProfileId },
      include: { user: true },
    });

    if (!doctorProfile) {
      res.status(404).json({ success: false, message: 'Doctor profile not found.' });
      return;
    }

    const updatedProfile = await prisma.doctorProfile.update({
      where: { id: doctorProfileId },
      data: {
        verificationStatus: DoctorStatus.APPROVED,
        verifiedAt: new Date(),
        verifiedById: req.user!.id,
        rejectionReason: null,
      },
    });

    // Notify doctor via push notification
    if (doctorProfile.user.fcmToken) {
      await sendPushNotification(
        doctorProfile.user.fcmToken,
        'Credentials Approved!',
        'Your medical credentials have been verified. You can now access your doctor clinical workspace.'
      );
    }

    res.json({
      success: true,
      message: `Dr. ${doctorProfile.user.fullName} has been approved successfully.`,
      doctor: { ...updatedProfile, user: doctorProfile.user },
    });
  } catch (error) {
    console.error('[Admin Approve Doctor Error]', error);
    res.status(500).json({ success: false, message: 'Failed to approve doctor.' });
  }
});

/**
 * Reject Doctor Credentials
 */
router.post('/doctors/:id/reject', async (req: Request, res: Response) => {
  try {
    const doctorProfileId = String(req.params.id);
    const { reason } = req.body;

    if (!reason || !reason.trim()) {
      res.status(400).json({ success: false, message: 'A rejection reason is required.' });
      return;
    }

    const doctorProfile = await prisma.doctorProfile.findUnique({
      where: { id: doctorProfileId },
      include: { user: true },
    });

    if (!doctorProfile) {
      res.status(404).json({ success: false, message: 'Doctor profile not found.' });
      return;
    }

    const updatedProfile = await prisma.doctorProfile.update({
      where: { id: doctorProfileId },
      data: {
        verificationStatus: DoctorStatus.REJECTED,
        rejectionReason: reason.trim(),
        verifiedById: req.user!.id,
      },
    });

    if (doctorProfile.user.fcmToken) {
      await sendPushNotification(
        doctorProfile.user.fcmToken,
        'Registration Status Update',
        `Your doctor application could not be approved: ${reason.trim()}`
      );
    }

    res.json({
      success: true,
      message: `Dr. ${doctorProfile.user.fullName} has been rejected.`,
      doctor: { ...updatedProfile, user: doctorProfile.user },
    });
  } catch (error) {
    console.error('[Admin Reject Doctor Error]', error);
    res.status(500).json({ success: false, message: 'Failed to reject doctor.' });
  }
});

/**
 * Suspend Doctor Credentials
 */
router.post('/doctors/:id/suspend', async (req: Request, res: Response) => {
  try {
    const doctorProfileId = String(req.params.id);
    const { reason } = req.body;

    const doctorProfile = await prisma.doctorProfile.findUnique({
      where: { id: doctorProfileId },
      include: { user: true },
    });

    if (!doctorProfile) {
      res.status(404).json({ success: false, message: 'Doctor profile not found.' });
      return;
    }

    const updatedProfile = await prisma.doctorProfile.update({
      where: { id: doctorProfileId },
      data: {
        verificationStatus: DoctorStatus.SUSPENDED,
        rejectionReason: reason?.trim() || 'Suspended by Super Administrator.',
        verifiedById: req.user!.id,
      },
    });

    res.json({
      success: true,
      message: `Dr. ${doctorProfile.user.fullName} has been suspended.`,
      doctor: { ...updatedProfile, user: doctorProfile.user },
    });
  } catch (error) {
    console.error('[Admin Suspend Doctor Error]', error);
    res.status(500).json({ success: false, message: 'Failed to suspend doctor.' });
  }
});

/**
 * Admin Metrics Overview Dashboard
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const [
      totalPatients,
      totalDoctors,
      pendingDoctors,
      totalAppointments,
      activeSubscriptions,
    ] = await Promise.all([
      prisma.user.count({ where: { role: UserRole.PATIENT } }),
      prisma.doctorProfile.count({ where: { verificationStatus: DoctorStatus.APPROVED } }),
      prisma.doctorProfile.count({ where: { verificationStatus: DoctorStatus.PENDING } }),
      prisma.appointment.count(),
      prisma.subscription.count({ where: { status: 'ACTIVE' } }),
    ]);

    res.json({
      success: true,
      stats: {
        totalPatients,
        activeDoctors: totalDoctors,
        pendingDoctorVerifications: pendingDoctors,
        totalConsultations: totalAppointments,
        activePaidSubscriptions: activeSubscriptions,
        monthlySubscriptionRateGhs: 10.0,
      },
    });
  } catch (error) {
    console.error('[Admin Stats Error]', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve stats.' });
  }
});

export default router;
