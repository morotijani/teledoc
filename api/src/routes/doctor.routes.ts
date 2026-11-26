import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { UserRole, DoctorStatus, AppointmentStatus } from '@prisma/client';
import { authenticateToken } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/rbac.middleware';
import { z } from 'zod';

const router = Router();

/**
 * Public Doctor Discovery: Search & Filter by name, specialty, or hospital
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { search, specialty, hospital } = req.query;

    const whereClause: any = {
      verificationStatus: DoctorStatus.APPROVED,
    };

    if (specialty) {
      whereClause.specialty = { contains: String(specialty), mode: 'insensitive' };
    }

    if (hospital) {
      whereClause.hospitalAffiliation = { contains: String(hospital), mode: 'insensitive' };
    }

    if (search) {
      whereClause.OR = [
        { specialty: { contains: String(search), mode: 'insensitive' } },
        { hospitalAffiliation: { contains: String(search), mode: 'insensitive' } },
        { user: { fullName: { contains: String(search), mode: 'insensitive' } } },
      ];
    }

    const doctors = await prisma.doctorProfile.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            avatarUrl: true,
            email: true,
            phoneNumber: true,
          },
        },
      },
      orderBy: { yearsOfExperience: 'desc' },
    });

    res.json({
      success: true,
      count: doctors.length,
      doctors,
    });
  } catch (error) {
    console.error('[Doctor Search Error]', error);
    res.status(500).json({ success: false, message: 'Failed to search doctors.' });
  }
});

/**
 * Get Specific Doctor Profile & Available Slots
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);

    const doctorProfile = await prisma.doctorProfile.findFirst({
      where: {
        OR: [{ id }, { userId: id }],
        verificationStatus: DoctorStatus.APPROVED,
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            avatarUrl: true,
            email: true,
            phoneNumber: true,
            availabilities: {
              where: { isActive: true },
              orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
            },
          },
        },
      },
    });

    if (!doctorProfile) {
      res.status(404).json({ success: false, message: 'Doctor not found or not approved.' });
      return;
    }

    res.json({
      success: true,
      doctor: doctorProfile,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch doctor profile.' });
  }
});

/**
 * Get Booked Time Windows for a Doctor on a Specific Date (Privacy-Safe)
 */
router.get('/:id/booked-slots', async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const dateParam = req.query.date ? String(req.query.date) : null;

    // Resolve doctor's userId whether caller passed DoctorProfile.id or User.id
    const doctorProfile = await prisma.doctorProfile.findFirst({
      where: { OR: [{ id }, { userId: id }] },
      select: { userId: true },
    });

    if (!doctorProfile) {
      res.status(404).json({ success: false, message: 'Doctor not found.' });
      return;
    }

    const whereClause: any = {
      doctorId: doctorProfile.userId,
      status: {
        in: [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED, AppointmentStatus.IN_PROGRESS],
      },
    };

    if (dateParam && !isNaN(Date.parse(dateParam))) {
      const target = new Date(dateParam);
      // Use +/- 1 day buffer around target date to safely handle any client timezone offset
      const rangeStart = new Date(target);
      rangeStart.setDate(rangeStart.getDate() - 1);
      rangeStart.setHours(0, 0, 0, 0);

      const rangeEnd = new Date(target);
      rangeEnd.setDate(rangeEnd.getDate() + 2);
      rangeEnd.setHours(0, 0, 0, 0);

      whereClause.scheduledStart = { gte: rangeStart, lt: rangeEnd };
    } else {
      whereClause.scheduledEnd = { gte: new Date() };
    }

    const appointments = await prisma.appointment.findMany({
      where: whereClause,
      select: {
        scheduledStart: true,
        scheduledEnd: true,
      },
      orderBy: { scheduledStart: 'asc' },
    });

    res.json({
      success: true,
      bookedSlots: appointments,
    });
  } catch (error) {
    console.error('[Booked Slots Error]', error);
    res.status(500).json({ success: false, message: 'Failed to fetch booked slots.' });
  }
});

const availabilitySchema = z.object({
  slots: z.array(
    z.object({
      dayOfWeek: z.number().min(0).max(6),
      startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Format must be HH:mm'),
      endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Format must be HH:mm'),
      slotDurationMinutes: z.number().min(10).max(120).default(30),
      isActive: z.boolean().default(true),
    })
  ),
});

/**
 * Doctor: Get My Weekly Availability Slots
 */
router.get(
  '/my/availabilities',
  authenticateToken,
  requireRole([UserRole.DOCTOR]),
  async (req: Request, res: Response) => {
    try {
      const availabilities = await prisma.doctorAvailability.findMany({
        where: { doctorId: req.user!.id },
        orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
      });

      res.json({
        success: true,
        availabilities,
      });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Failed to fetch availabilities.' });
    }
  }
);

/**
 * Doctor: Update Weekly Availability Slots
 */
router.post(
  '/my/availabilities',
  authenticateToken,
  requireRole([UserRole.DOCTOR]),
  async (req: Request, res: Response) => {
    try {
      const { slots } = availabilitySchema.parse(req.body);
      const doctorId = req.user!.id;

      // Replace existing availability slots atomically
      await prisma.$transaction(async (tx) => {
        await tx.doctorAvailability.deleteMany({
          where: { doctorId },
        });

        await tx.doctorAvailability.createMany({
          data: slots.map((s) => ({
            doctorId,
            dayOfWeek: s.dayOfWeek,
            startTime: s.startTime,
            endTime: s.endTime,
            slotDurationMinutes: s.slotDurationMinutes,
            isActive: s.isActive,
          })),
        });
      });

      const updated = await prisma.doctorAvailability.findMany({
        where: { doctorId },
        orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
      });

      res.json({
        success: true,
        message: 'Availability schedule updated successfully.',
        availabilities: updated,
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ success: false, errors: error.errors });
        return;
      }
      res.status(500).json({ success: false, message: 'Failed to update availabilities.' });
    }
  }
);

/**
 * Doctor: Appointment Dashboard (Upcoming, Ongoing, Past)
 */
router.get(
  '/my/appointments',
  authenticateToken,
  requireRole([UserRole.DOCTOR]),
  async (req: Request, res: Response) => {
    try {
      const doctorId = req.user!.id;
      const { status } = req.query;

      const appointments = await prisma.appointment.findMany({
        where: {
          doctorId,
          ...(status ? { status: status as AppointmentStatus } : {}),
        },
        include: {
          patient: {
            select: {
              id: true,
              fullName: true,
              phoneNumber: true,
              email: true,
              avatarUrl: true,
            },
          },
          consultation: {
            include: {
              prescriptions: true,
            },
          },
        },
        orderBy: { scheduledStart: 'asc' },
      });

      res.json({
        success: true,
        count: appointments.length,
        appointments,
      });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Failed to fetch appointments.' });
    }
  }
);

/**
 * Doctor: List Assigned/Booked Patients with Medical Profiles
 */
router.get(
  '/my/patients',
  authenticateToken,
  requireRole([UserRole.DOCTOR]),
  async (req: Request, res: Response) => {
    try {
      const doctorId = req.user!.id;

      // Find distinct patients who have had appointments with this doctor
      const appointments = await prisma.appointment.findMany({
        where: { doctorId },
        select: {
          patient: {
            select: {
              id: true,
              fullName: true,
              phoneNumber: true,
              email: true,
              avatarUrl: true,
              medicalRecords: {
                orderBy: { createdAt: 'desc' },
                take: 5,
              },
              patientPrescriptions: {
                where: { doctorId },
                orderBy: { createdAt: 'desc' },
                take: 5,
              },
            },
          },
        },
        distinct: ['patientId'],
      });

      const patients = appointments.map((a) => a.patient);

      res.json({
        success: true,
        count: patients.length,
        patients,
      });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Failed to fetch doctor patients.' });
    }
  }
);

/**
 * Doctor: List All Patient Chat Threads (Inbox)
 */
router.get(
  '/my/chats',
  authenticateToken,
  requireRole([UserRole.DOCTOR]),
  async (req: Request, res: Response) => {
    try {
      const doctorId = req.user!.id;

      const appointments = await prisma.appointment.findMany({
        where: { doctorId },
        include: {
          patient: {
            select: {
              id: true,
              fullName: true,
              phoneNumber: true,
              avatarUrl: true,
            },
          },
          chatMessages: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            include: {
              sender: { select: { id: true, fullName: true, role: true } },
            },
          },
          _count: {
            select: { chatMessages: true },
          },
        },
        orderBy: { updatedAt: 'desc' },
      });

      // Deduplicate by patientId, keeping the most recent appointment/thread per patient
      const seenPatients = new Set<string>();
      const threads = [];
      for (const appt of appointments) {
        if (seenPatients.has(appt.patientId)) continue;
        seenPatients.add(appt.patientId);
        threads.push({
          appointmentId: appt.id,
          channelId: appt.meetingChannelId,
          status: appt.status,
          scheduledStart: appt.scheduledStart,
          patient: appt.patient,
          lastMessage: appt.chatMessages[0] || null,
          messageCount: appt._count.chatMessages,
        });
      }

      // Sort threads: most recent message first, then most recent appointment
      threads.sort((a, b) => {
        const timeA = a.lastMessage
          ? new Date(a.lastMessage.createdAt).getTime()
          : new Date(a.scheduledStart).getTime();
        const timeB = b.lastMessage
          ? new Date(b.lastMessage.createdAt).getTime()
          : new Date(b.scheduledStart).getTime();
        return timeB - timeA;
      });

      res.json({
        success: true,
        count: threads.length,
        threads,
      });
    } catch (error) {
      console.error('[Doctor Chats Error]', error);
      res.status(500).json({ success: false, message: 'Failed to load chat threads.' });
    }
  }
);

const updateDoctorProfileSchema = z.object({
  fullName: z.string().min(2).optional(),
  phoneNumber: z.string().min(9).optional(),
  email: z.string().email().optional().or(z.literal('')),
  specialty: z.string().min(2).optional(),
  subSpecialty: z.string().optional(),
  hospitalAffiliation: z.string().optional(),
  yearsOfExperience: z.number().nonnegative().optional(),
  consultationFee: z.number().nonnegative().optional(),
  bio: z.string().optional(),
});

/**
 * Doctor: Update Personal & Clinical Profile Details
 */
router.put(
  '/my/profile',
  authenticateToken,
  requireRole([UserRole.DOCTOR]),
  async (req: Request, res: Response) => {
    try {
      const data = updateDoctorProfileSchema.parse(req.body);
      const doctorId = req.user!.id;

      const updatedUser = await prisma.$transaction(async (tx) => {
        const user = await tx.user.update({
          where: { id: doctorId },
          data: {
            ...(data.fullName ? { fullName: data.fullName } : {}),
            ...(data.phoneNumber ? { phoneNumber: data.phoneNumber } : {}),
            ...(data.email !== undefined ? { email: data.email || null } : {}),
          },
        });

        const profile = await tx.doctorProfile.update({
          where: { userId: doctorId },
          data: {
            ...(data.specialty ? { specialty: data.specialty } : {}),
            ...(data.subSpecialty !== undefined ? { subSpecialty: data.subSpecialty || null } : {}),
            ...(data.hospitalAffiliation !== undefined
              ? { hospitalAffiliation: data.hospitalAffiliation || null }
              : {}),
            ...(data.yearsOfExperience !== undefined
              ? { yearsOfExperience: data.yearsOfExperience }
              : {}),
            ...(data.consultationFee !== undefined ? { consultationFee: data.consultationFee } : {}),
            ...(data.bio !== undefined ? { bio: data.bio || null } : {}),
          },
        });

        return { user, profile };
      });

      res.json({
        success: true,
        message: 'Doctor profile updated successfully.',
        user: {
          id: updatedUser.user.id,
          role: updatedUser.user.role,
          fullName: updatedUser.user.fullName,
          phoneNumber: updatedUser.user.phoneNumber,
          email: updatedUser.user.email,
          avatarUrl: updatedUser.user.avatarUrl,
        },
        doctorProfile: updatedUser.profile,
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ success: false, errors: error.errors });
        return;
      }
      console.error('[Update Doctor Profile Error]', error);
      res.status(500).json({ success: false, message: 'Failed to update doctor profile.' });
    }
  }
);

export default router;
