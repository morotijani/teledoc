import { PrismaClient, UserRole, DoctorStatus, SubscriptionStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

interface SeedDoctor {
  fullName: string;
  email: string;
  phoneNumber: string;
  specialty: string;
  subSpecialty?: string;
  licenseNumber: string;
  hospitalAffiliation: string;
  yearsOfExperience: number;
  bio: string;
  consultationFee: number;
  status: DoctorStatus;
  days: number[];
  startTime: string;
  endTime: string;
}

const ADDITIONAL_CLINICIANS: SeedDoctor[] = [
  {
    fullName: 'Dr. Abena Osei-Tutu, MBChB',
    email: 'dr.oseitutu@teledoc.gh',
    phoneNumber: '+233240000010',
    specialty: 'General Practice',
    subSpecialty: 'Preventive & Family Medicine',
    licenseNumber: 'MDC-GH-2019-4120',
    hospitalAffiliation: 'Nyaho Medical Centre, Accra',
    yearsOfExperience: 7,
    bio: 'Primary care physician focused on holistic family health, chronic disease management, malaria & infectious disease care, and routine telehealth checkups.',
    consultationFee: 0.0,
    status: DoctorStatus.APPROVED,
    days: [1, 2, 3, 4, 5, 6],
    startTime: '08:00',
    endTime: '17:00',
  },
  {
    fullName: 'Dr. Yaw Adjei-Darko, FWACS',
    email: 'dr.adjeidarko@teledoc.gh',
    phoneNumber: '+233240000011',
    specialty: 'Obstetrics',
    subSpecialty: 'Maternal-Fetal Medicine',
    licenseNumber: 'MDC-GH-2015-2209',
    hospitalAffiliation: 'Greater Accra Regional Hospital (Ridge)',
    yearsOfExperience: 14,
    bio: 'Consultant Obstetrician & Gynecologist specializing in antenatal monitoring, high-risk pregnancy counseling, and women’s reproductive wellness.',
    consultationFee: 45.0,
    status: DoctorStatus.APPROVED,
    days: [1, 2, 4, 5],
    startTime: '09:00',
    endTime: '15:00',
  },
  {
    fullName: 'Dr. Efua Mansa Quarshie, MD',
    email: 'dr.quarshie@teledoc.gh',
    phoneNumber: '+233240000012',
    specialty: 'Pediatrics',
    subSpecialty: 'Pediatric Pulmonology & Allergy',
    licenseNumber: 'MDC-GH-2017-6731',
    hospitalAffiliation: '37 Military Hospital, Accra',
    yearsOfExperience: 10,
    bio: 'Specialist Pediatrician experienced in childhood asthma, immunization schedules, newborn nutrition, and acute pediatric fever triage.',
    consultationFee: 30.0,
    status: DoctorStatus.APPROVED,
    days: [1, 2, 3, 4, 5],
    startTime: '09:00',
    endTime: '16:00',
  },
  {
    fullName: 'Dr. Ibrahim Alhassan, FWACP',
    email: 'dr.alhassan@teledoc.gh',
    phoneNumber: '+233240000013',
    specialty: 'Dermatology',
    subSpecialty: 'Clinical & Tropical Dermatology',
    licenseNumber: 'MDC-GH-2016-8812',
    hospitalAffiliation: 'Tamale Teaching Hospital, Northern Region',
    yearsOfExperience: 11,
    bio: 'Consultant Dermatologist treating eczema, acne, fungal skin infections, keloids, and pigmentary disorders via high-resolution teledermatology.',
    consultationFee: 35.0,
    status: DoctorStatus.APPROVED,
    days: [1, 3, 5, 6],
    startTime: '10:00',
    endTime: '16:00',
  },
  {
    fullName: 'Dr. Akosua Frema Boakye, MD',
    email: 'dr.boakye@teledoc.gh',
    phoneNumber: '+233240000014',
    specialty: 'Cardiology',
    subSpecialty: 'Hypertension & Heart Failure',
    licenseNumber: 'MDC-GH-2014-3198',
    hospitalAffiliation: 'Komfo Anokye Teaching Hospital, Kumasi',
    yearsOfExperience: 15,
    bio: 'Cardiologist dedicated to blood pressure optimization, ECG interpretation, cholesterol management, and long-term cardiac rehabilitation.',
    consultationFee: 50.0,
    status: DoctorStatus.APPROVED,
    days: [1, 2, 3, 4],
    startTime: '08:00',
    endTime: '14:00',
  },
  {
    fullName: 'Dr. Kojo Baiden-Amissah, MGCP',
    email: 'dr.baiden@teledoc.gh',
    phoneNumber: '+233240000015',
    specialty: 'Internal Medicine',
    subSpecialty: 'Endocrinology & Diabetes Care',
    licenseNumber: 'MDC-GH-2016-5042',
    hospitalAffiliation: 'Cape Coast Teaching Hospital, Central Region',
    yearsOfExperience: 12,
    bio: 'Internal Medicine specialist helping patients manage Type 1 & Type 2 diabetes, thyroid disorders, and metabolic health with continuous remote follow-ups.',
    consultationFee: 40.0,
    status: DoctorStatus.APPROVED,
    days: [2, 3, 4, 5],
    startTime: '09:00',
    endTime: '15:00',
  },
  {
    fullName: 'Dr. Esi Kwakye-Nuako, MSc Psych',
    email: 'dr.kwakye@teledoc.gh',
    phoneNumber: '+233240000016',
    specialty: 'Psychiatry & Mental Health',
    subSpecialty: 'Anxiety, Sleep & Stress Medicine',
    licenseNumber: 'MDC-GH-2018-7745',
    hospitalAffiliation: 'Accra Psychiatric & Wellness Clinic',
    yearsOfExperience: 9,
    bio: 'Compassionate psychiatrist offering confidential tele-mental health support for burnout, anxiety, insomnia, and postpartum mood care.',
    consultationFee: 0.0,
    status: DoctorStatus.APPROVED,
    days: [1, 2, 3, 4, 5],
    startTime: '10:00',
    endTime: '18:00',
  },
  {
    fullName: 'Dr. Mawuli Agbeko, MBChB',
    email: 'dr.agbeko@teledoc.gh',
    phoneNumber: '+233240000017',
    specialty: 'General Practice',
    subSpecialty: 'Urgent Care & Travel Medicine',
    licenseNumber: 'MDC-GH-2020-6290',
    hospitalAffiliation: 'Ho Teaching Hospital, Volta Region',
    yearsOfExperience: 6,
    bio: 'Dedicated general medical officer providing rapid same-day consultations for acute infections, lab result reviews, and travel vaccinations.',
    consultationFee: 0.0,
    status: DoctorStatus.APPROVED,
    days: [0, 1, 2, 3, 4, 5],
    startTime: '08:00',
    endTime: '16:00',
  },
  {
    fullName: 'Dr. Nana Yaa Agyemang, FWACS',
    email: 'dr.agyemang@teledoc.gh',
    phoneNumber: '+233240000018',
    specialty: 'Ophthalmology',
    subSpecialty: 'Glaucoma & Anterior Segment',
    licenseNumber: 'MDC-GH-2013-1187',
    hospitalAffiliation: 'Euracare Advanced Diagnostics, Accra',
    yearsOfExperience: 16,
    bio: 'Senior Ophthalmologist providing eye symptom triage, glaucoma screening guidance, allergic conjunctivitis treatment, and post-operative reviews.',
    consultationFee: 45.0,
    status: DoctorStatus.APPROVED,
    days: [1, 3, 5],
    startTime: '09:00',
    endTime: '14:00',
  },
  {
    fullName: 'Dr. Kofi Owusu-Ansah, MBChB',
    email: 'dr.owusuansah@teledoc.gh',
    phoneNumber: '+233240000019',
    specialty: 'Orthopedics',
    subSpecialty: 'Sports Injury & Joint Care',
    licenseNumber: 'MDC-GH-2022-9104',
    hospitalAffiliation: 'Bank of Ghana Hospital, Cantonments',
    yearsOfExperience: 5,
    bio: 'Orthopedic clinician focused on musculoskeletal pain assessment, sports rehabilitation, back pain triage, and X-ray/MRI review.',
    consultationFee: 35.0,
    status: DoctorStatus.PENDING,
    days: [1, 2, 4, 5],
    startTime: '09:00',
    endTime: '15:00',
  },
];

async function main() {
  console.log('Starting TeleDoc Ghana database seeding...');

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
  console.log(`Super Admin ready: ${admin.email}`);

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

  const existingMensahSlots = await prisma.doctorAvailability.count({
    where: { doctorId: approvedDoctorUser.id },
  });
  if (existingMensahSlots === 0) {
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
  }
  console.log(`Approved Doctor ready: ${approvedDoctorUser.email}`);

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
  console.log(`Pending Doctor ready: ${pendingDoctorUser.email}`);

  // 4. Seed 10 Additional Diverse Ghanaian Clinicians
  for (const doc of ADDITIONAL_CLINICIANS) {
    const user = await prisma.user.upsert({
      where: { phoneNumber: doc.phoneNumber },
      update: {},
      create: {
        role: UserRole.DOCTOR,
        fullName: doc.fullName,
        email: doc.email,
        phoneNumber: doc.phoneNumber,
        passwordHash,
        doctorProfile: {
          create: {
            specialty: doc.specialty,
            subSpecialty: doc.subSpecialty,
            licenseNumber: doc.licenseNumber,
            hospitalAffiliation: doc.hospitalAffiliation,
            yearsOfExperience: doc.yearsOfExperience,
            bio: doc.bio,
            consultationFee: doc.consultationFee,
            documentUrls: [`https://example.com/certs/${doc.licenseNumber.toLowerCase()}.pdf`],
            verificationStatus: doc.status,
            verifiedAt: doc.status === DoctorStatus.APPROVED ? new Date() : null,
            verifiedById: doc.status === DoctorStatus.APPROVED ? admin.id : null,
          },
        },
      },
    });

    const existingSlots = await prisma.doctorAvailability.count({
      where: { doctorId: user.id },
    });

    if (existingSlots === 0 && doc.days.length > 0) {
      await prisma.doctorAvailability.createMany({
        data: doc.days.map((day) => ({
          doctorId: user.id,
          dayOfWeek: day,
          startTime: doc.startTime,
          endTime: doc.endTime,
          slotDurationMinutes: 30,
          isActive: true,
        })),
      });
    }
    console.log(`Clinician ready: ${doc.fullName} (${doc.specialty} - ${doc.status})`);
  }

  // 5. Test Patient with 90-Day Free Trial (Kwame Asante)
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
  console.log(`Test Patient ready: ${patient.email}`);

  console.log('Database seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
