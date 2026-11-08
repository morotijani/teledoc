import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../lib/prisma';
import { UserRole, DoctorStatus, AppointmentStatus } from '@prisma/client';
import { authenticateToken } from '../middleware/auth.middleware';
import { requireActiveSubscription } from '../middleware/subscription.middleware';
import { sendPushNotification } from '../lib/notifications';

const router = Router();

const bookAppointmentSchema = z.object({
  doctorId: z.string().uuid(),
  scheduledStart: z.string().refine((val) => !isNaN(Date.parse(val)), 'Invalid datetime format'),
  scheduledEnd: z.string().refine((val) => !isNaN(Date.parse(val)), 'Invalid datetime format'),
  symptomsDescription: z.string().optional(),
});

/**
 * Patient: Book Appointment with a Doctor
 * Strictly guarded by Subscription Paywall Middleware
 */
router.post(
  '/book',
  authenticateToken,
  requireActiveSubscription,
  async (req: Request, res: Response) => {
    try {
      const data = bookAppointmentSchema.parse(req.body);
      const patientId = req.user!.id;

      // 1. Check if Doctor exists and is approved
      const doctor = await prisma.user.findFirst({
        where: {
          id: data.doctorId,
          role: UserRole.DOCTOR,
          doctorProfile: {
            verificationStatus: DoctorStatus.APPROVED,
          },
        },
        include: { doctorProfile: true },
      });

      if (!doctor) {
        res.status(404).json({
          success: false,
          message: 'The requested doctor is not available or not yet approved.',
        });
        return;
      }

      const scheduledStart = new Date(data.scheduledStart);
      const scheduledEnd = new Date(data.scheduledEnd);

      if (scheduledStart >= scheduledEnd) {
        res.status(400).json({
          success: false,
          message: 'Scheduled start time must be before end time.',
        });
        return;
      }

      if (scheduledStart < new Date()) {
        res.status(400).json({
          success: false,
          message: 'Cannot book appointments in the past.',
        });
        return;
      }

      // 2. Check for slot conflict with doctor
      const existingConflict = await prisma.appointment.findFirst({
        where: {
          doctorId: data.doctorId,
          status: { in: [AppointmentStatus.CONFIRMED, AppointmentStatus.IN_PROGRESS] },
          OR: [
            {
              scheduledStart: { lt: scheduledEnd },
              scheduledEnd: { gt: scheduledStart },
            },
          ],
        },
      });

      if (existingConflict) {
        res.status(409).json({
          success: false,
          message: 'This time slot has already been booked. Please choose another slot.',
        });
        return;
      }

      // 3. Create appointment with unique WebRTC Agora Channel ID
      const meetingChannelId = `tele_${uuidv4().replace(/-/g, '').substring(0, 16)}`;

      const appointment = await prisma.appointment.create({
        data: {
          patientId,
          doctorId: data.doctorId,
          scheduledStart,
          scheduledEnd,
          meetingChannelId,
          symptomsDescription: data.symptomsDescription,
          status: AppointmentStatus.CONFIRMED,
        },
        include: {
          doctor: {
            select: { fullName: true, phoneNumber: true, avatarUrl: true, fcmToken: true },
          },
          patient: {
            select: { fullName: true, phoneNumber: true },
          },
        },
      });

      // 4. Send real-time notification to doctor
      if (appointment.doctor.fcmToken) {
        await sendPushNotification(
          appointment.doctor.fcmToken,
          'New Appointment Booked',
          `Patient ${appointment.patient.fullName} has booked a session for ${scheduledStart.toLocaleString()}`
        );
      }

      res.status(201).json({
        success: true,
        message: 'Appointment booked successfully.',
        appointment,
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ success: false, errors: error.errors });
        return;
      }
      console.error('[Book Appointment Error]', error);
      res.status(500).json({ success: false, message: 'Internal server error while booking appointment.' });
    }
  }
);

/**
 * Get Patient's Appointments
 */
router.get('/my', authenticateToken, async (req: Request, res: Response) => {
  try {
    const appointments = await prisma.appointment.findMany({
      where: { patientId: req.user!.id },
      include: {
        doctor: {
          select: {
            id: true,
            fullName: true,
            phoneNumber: true,
            avatarUrl: true,
            doctorProfile: {
              select: { specialty: true, hospitalAffiliation: true },
            },
          },
        },
        consultation: {
          select: {
            id: true,
            appointmentId: true,
            patientSummary: true,
            diagnosis: true,
            createdAt: true,
            updatedAt: true,
            prescriptions: true,
          },
        },
      },
      orderBy: { scheduledStart: 'desc' },
    });

    res.json({
      success: true,
      count: appointments.length,
      appointments,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch appointments.' });
  }
});

/**
 * Get Specific Appointment Details
 */
router.get('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);

    const appointment = await prisma.appointment.findUnique({
      where: { id },
      include: {
        patient: {
          select: {
            id: true,
            fullName: true,
            phoneNumber: true,
            email: true,
            avatarUrl: true,
            medicalRecords: true,
          },
        },
        doctor: {
          select: {
            id: true,
            fullName: true,
            phoneNumber: true,
            avatarUrl: true,
            doctorProfile: true,
          },
        },
        consultation: {
          include: { prescriptions: true },
        },
      },
    });

    if (!appointment) {
      res.status(404).json({ success: false, message: 'Appointment not found.' });
      return;
    }

    // Access check: User must be doctor, patient, or admin
    if (
      req.user!.role !== UserRole.ADMIN &&
      appointment.patientId !== req.user!.id &&
      appointment.doctorId !== req.user!.id
    ) {
      res.status(403).json({ success: false, message: 'Unauthorized to view this appointment.' });
      return;
    }

    // Strip confidential doctorNotes if requested by a patient
    const sanitizedAppointment =
      req.user!.role === UserRole.PATIENT && appointment.consultation
        ? {
            ...appointment,
            consultation: {
              ...appointment.consultation,
              doctorNotes: undefined,
            },
          }
        : appointment;

    res.json({
      success: true,
      appointment: sanitizedAppointment,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch appointment.' });
  }
});

/**
 * Cancel Appointment
 */
router.patch('/:id/cancel', authenticateToken, async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);

    const appointment = await prisma.appointment.findUnique({
      where: { id },
    });

    if (!appointment) {
      res.status(404).json({ success: false, message: 'Appointment not found.' });
      return;
    }

    if (appointment.patientId !== req.user!.id && appointment.doctorId !== req.user!.id) {
      res.status(403).json({ success: false, message: 'Unauthorized to cancel this appointment.' });
      return;
    }

    const updated = await prisma.appointment.update({
      where: { id },
      data: { status: AppointmentStatus.CANCELLED },
    });

    res.json({
      success: true,
      message: 'Appointment cancelled.',
      appointment: updated,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to cancel appointment.' });
  }
});

export default router;
