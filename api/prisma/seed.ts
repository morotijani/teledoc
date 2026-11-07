import { PrismaClient, UserRole, DoctorStatus, SubscriptionStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting TeleDoc Ghana database seeding...');

  const passwordHash = await bcrypt.hash('Password123!', 10);

  // 1. Super Admin Account
  const admin = await prisma.user.upsert({
    where: { phoneNumber: '+233240000001' },
    update: {},
    create: {
      role: UserRole.ADMIN,
      fullName: 'Nana Kwame (Super Admin)',
      email: 'admin@teledoc.gh',
      phoneNumber: '+233240000001',
      passwordHash,
    },
  });
  console.log(`✅ Super Admin created: ${admin.email}`);

  // 2. Approved Doctor (Dr. Kwesi Mensah - Cardiologist)
  const approvedDoctorUser = await prisma.user.upsert({
    where: { phoneNumber: '+233240000002' },
    update: {},
    create: {
      role: UserRole.DOCTOR,
      fullName: 'Dr. Kwesi Mensah, MD',
      email: 'dr.mensah@teledoc.gh',
      phoneNumber: '+233240000002',
      passwordHash,
      doctorProfile: {
        create: {
          specialty: 'Cardiology',
          subSpecialty: 'Interventional Cardiology',
          licenseNumber: 'MDC-GH-2018-9844',
          hospitalAffiliation: 'Korle-Bu Teaching Hospital, Accra',
          yearsOfExperience: 12,
          bio: 'Senior Consultant Cardiologist with extensive clinical practice managing hypertension, cardiovascular disorders, and preventative medicine in Ghana.',
          consultationFee: 50.0,
          documentUrls: [
            'https://example.com/certs/mdc_license_mensah.pdf',
            'https://example.com/certs/specialist_fellowship.pdf',
          ],
          verificationStatus: DoctorStatus.APPROVED,
          verifiedAt: new Date(),
          verifiedById: admin.id,
        },
      },
    },
  });

  // Create availability slots for Dr. Mensah (Mon-Fri, 9:00 - 15:00)
  for (let day = 1; day <= 5; day++) {
    await prisma.doctorAvailability.create({
      data: {
        doctorId: approvedDoctorUser.id,
        dayOfWeek: day,
        startTime: '09:00',
        endTime: '15:00',
        slotDurationMinutes: 30,
        isActive: true,
      },
    });
  }
  console.log(`✅ Approved Doctor created: ${approvedDoctorUser.email}`);

  // 3. Pending Doctor (Dr. Ama Boateng - Pediatrician)
  const pendingDoctorUser = await prisma.user.upsert({
    where: { phoneNumber: '+233240000003' },
    update: {},
    create: {
      role: UserRole.DOCTOR,
      fullName: 'Dr. Ama Boateng',
      email: 'dr.boateng@teledoc.gh',
      phoneNumber: '+233240000003',
      passwordHash,
      doctorProfile: {
        create: {
          specialty: 'Pediatrics',
          subSpecialty: 'Neonatal Care',
          licenseNumber: 'MDC-GH-2023-5561',
          hospitalAffiliation: 'Komfo Anokye Teaching Hospital, Kumasi',
          yearsOfExperience: 4,
          bio: 'Pediatric care specialist focusing on early childhood wellness, acute illnesses, and growth monitoring.',
          consultationFee: 40.0,
          documentUrls: ['https://example.com/certs/mdc_license_boateng.pdf'],
          verificationStatus: DoctorStatus.PENDING,
        },
      },
    },
  });
  console.log(`✅ Pending Doctor created: ${pendingDoctorUser.email} (Status: PENDING)`);

  // 4. Test Patient with 90-Day Free Trial (Kwame Asante)
  const now = new Date();
  const trialEndsAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);

  const patient = await prisma.user.upsert({
    where: { phoneNumber: '+233240000004' },
    update: {},
    create: {
      role: UserRole.PATIENT,
      fullName: 'Kwame Asante',
      email: 'kwame.asante@gmail.com',
      phoneNumber: '+233240000004',
      passwordHash,
      subscription: {
        create: {
          status: SubscriptionStatus.TRIAL,
          trialStartsAt: now,
          trialEndsAt,
          amountGhs: 10.0,
        },
      },
    },
  });
  console.log(`✅ Test Patient created: ${patient.email} (90-day trial until: ${trialEndsAt.toDateString()})`);

  console.log('🎉 Database seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
