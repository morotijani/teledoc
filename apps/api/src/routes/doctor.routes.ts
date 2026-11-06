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

export default router;
