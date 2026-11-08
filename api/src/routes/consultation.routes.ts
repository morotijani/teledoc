import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { UserRole, AppointmentStatus } from '@prisma/client';
import { authenticateToken } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/rbac.middleware';
import { generateAgoraRtcToken } from '../lib/agora';
import { sendPushNotification } from '../lib/notifications';

const router = Router();

/**
 * Generate Agora RTC Video/Audio Session Token
 */
router.post('/:appointmentId/agora-token', authenticateToken, async (req: Request, res: Response) => {
  try {
    const appointmentId = String(req.params.appointmentId);
    const userId = req.user!.id;

    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        doctor: { select: { id: true, fullName: true, fcmToken: true } },
        patient: { select: { id: true, fullName: true, fcmToken: true } },
      },
    });

    if (!appointment) {
      res.status(404).json({ success: false, message: 'Appointment not found.' });
      return;
    }

    // Verify participant
    if (appointment.patientId !== userId && appointment.doctorId !== userId && req.user!.role !== UserRole.ADMIN) {
      res.status(403).json({ success: false, message: 'Unauthorized to join this video consultation.' });
      return;
    }

    // Mark as in-progress if currently confirmed
    if (appointment.status === AppointmentStatus.CONFIRMED) {
      await prisma.appointment.update({
        where: { id: appointmentId },
        data: { status: AppointmentStatus.IN_PROGRESS },
      });
    }

    // Generate Agora Token
    const agoraData = generateAgoraRtcToken(appointment.meetingChannelId);

    // Notify other participant that session is being started
    const otherParticipantToken =
      userId === appointment.patientId ? appointment.doctor.fcmToken : appointment.patient.fcmToken;
    const callerName = req.user!.fullName;

    if (otherParticipantToken) {
      await sendPushNotification(
        otherParticipantToken,
        'Incoming Telehealth Call',
        `${callerName} has entered the video consultation room.`,
        { appointmentId, channelId: appointment.meetingChannelId }
      );
    }

    res.json({
      success: true,
      channelId: appointment.meetingChannelId,
      token: agoraData.token,
      appId: agoraData.appId,
      uid: agoraData.uid,
    });
  } catch (error) {
    console.error('[Agora Token Error]', error);
    res.status(500).json({ success: false, message: 'Failed to generate video consultation token.' });
  }
});

const consultancyNotesSchema = z.object({
  doctorNotes: z.string().optional(),
  patientSummary: z.string().min(3, 'Summary of consultation is required'),
  diagnosis: z.string().min(2, 'Diagnosis is required'),
});

/**
 * Doctor: Post Clinical Consultation Notes
 */
router.post(
  '/:appointmentId/notes',
  authenticateToken,
  requireRole([UserRole.DOCTOR]),
  async (req: Request, res: Response) => {
    try {
      const appointmentId = String(req.params.appointmentId);
      const data = consultancyNotesSchema.parse(req.body);

      const appointment = await prisma.appointment.findUnique({
        where: { id: appointmentId },
      });

      if (!appointment || appointment.doctorId !== req.user!.id) {
        res.status(403).json({ success: false, message: 'Unauthorized or appointment not found.' });
        return;
      }

      // Upsert consultation record
      const consultation = await prisma.consultation.upsert({
        where: { appointmentId },
        create: {
          appointmentId,
          doctorNotes: data.doctorNotes,
          patientSummary: data.patientSummary,
          diagnosis: data.diagnosis,
        },
        update: {
          doctorNotes: data.doctorNotes,
          patientSummary: data.patientSummary,
          diagnosis: data.diagnosis,
        },
      });

      // Mark appointment as COMPLETED
      await prisma.appointment.update({
        where: { id: appointmentId },
        data: { status: AppointmentStatus.COMPLETED },
      });

      res.json({
        success: true,
        message: 'Consultancy notes saved and session marked as completed.',
        consultation,
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ success: false, errors: error.errors });
        return;
      }
      res.status(500).json({ success: false, message: 'Failed to save clinical notes.' });
    }
  }
);

const prescriptionSchema = z.object({
  medications: z.array(
    z.object({
      drugName: z.string().min(1, 'Drug name is required'),
      dosage: z.string().min(1, 'Dosage is required (e.g. 500mg)'),
      frequency: z.string().min(1, 'Frequency is required (e.g. 3x daily)'),
      duration: z.string().min(1, 'Duration is required (e.g. 7 days)'),
      instructions: z.string().optional(),
    })
  ).min(1, 'At least one medication is required'),
});

/**
 * Doctor: Issue Digital Prescription
 */
router.post(
  '/:appointmentId/prescriptions',
  authenticateToken,
  requireRole([UserRole.DOCTOR]),
  async (req: Request, res: Response) => {
    try {
      const appointmentId = String(req.params.appointmentId);
      const { medications } = prescriptionSchema.parse(req.body);

      const appointment = await prisma.appointment.findUnique({
        where: { id: appointmentId },
        include: { patient: { select: { id: true, fullName: true, fcmToken: true } } },
      });

      if (!appointment || appointment.doctorId !== req.user!.id) {
        res.status(403).json({ success: false, message: 'Unauthorized or appointment not found.' });
        return;
      }

      // Ensure consultation exists first
      let consultation = await prisma.consultation.findUnique({
        where: { appointmentId },
      });

      if (!consultation) {
        consultation = await prisma.consultation.create({
          data: {
            appointmentId,
            patientSummary: 'Prescription issued during teleconsultation.',
          },
        });
      }

      const prescription = await prisma.prescription.create({
        data: {
          consultationId: consultation.id,
          patientId: appointment.patientId,
          doctorId: req.user!.id,
          medications,
        },
      });

      // Send push notification to patient that prescription is ready
      if (appointment.patient.fcmToken) {
        await sendPushNotification(
          appointment.patient.fcmToken,
          'New Digital Prescription',
          `Dr. ${req.user!.fullName} has issued a digital prescription for your consultation.`
        );
      }

      res.status(201).json({
        success: true,
        message: 'Digital prescription issued and synchronized with patient profile.',
        prescription,
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ success: false, errors: error.errors });
        return;
      }
      res.status(500).json({ success: false, message: 'Failed to issue prescription.' });
    }
  }
);

/**
 * Get Chat Message History for an Appointment
 */
router.get('/:appointmentId/messages', authenticateToken, async (req: Request, res: Response) => {
  try {
    const appointmentId = String(req.params.appointmentId);
    const userId = req.user!.id;

    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      select: { patientId: true, doctorId: true },
    });

    if (!appointment) {
      res.status(404).json({ success: false, message: 'Appointment not found.' });
      return;
    }

    if (
      appointment.patientId !== userId &&
      appointment.doctorId !== userId &&
      req.user!.role !== UserRole.ADMIN
    ) {
      res.status(403).json({ success: false, message: 'Unauthorized to view chat messages.' });
      return;
    }

    const messages = await prisma.chatMessage.findMany({
      where: { appointmentId },
      include: {
        sender: {
          select: { id: true, fullName: true, role: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    res.json({
      success: true,
      count: messages.length,
      messages,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to retrieve chat messages.' });
  }
});

/**
 * Get Consultation & Prescription Details
 */
router.get('/:appointmentId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const appointmentId = String(req.params.appointmentId);

    const consultation = await prisma.consultation.findUnique({
      where: { appointmentId },
      include: {
        prescriptions: true,
        appointment: {
          include: {
            doctor: { select: { fullName: true, phoneNumber: true, doctorProfile: true } },
            patient: { select: { fullName: true, phoneNumber: true } },
          },
        },
      },
    });

    if (!consultation) {
      res.status(404).json({ success: false, message: 'Consultation records not found for this appointment.' });
      return;
    }

    // Verify caller is patient, treating doctor, or admin
    if (
      req.user!.role !== UserRole.ADMIN &&
      consultation.appointment.patientId !== req.user!.id &&
      consultation.appointment.doctorId !== req.user!.id
    ) {
      res.status(403).json({ success: false, message: 'Unauthorized to view this consultation.' });
      return;
    }

    const sanitizedConsultation =
      req.user!.role === UserRole.PATIENT
        ? { ...consultation, doctorNotes: undefined }
        : consultation;

    res.json({
      success: true,
      consultation: sanitizedConsultation,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to retrieve consultation details.' });
  }
});

export default router;
