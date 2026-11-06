export enum UserRole {
  PATIENT = 'PATIENT',
  DOCTOR = 'DOCTOR',
  ADMIN = 'ADMIN'
}

export enum DoctorStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  SUSPENDED = 'SUSPENDED'
}

export enum AppointmentStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED'
}

export enum SubscriptionStatus {
  TRIAL = 'TRIAL',
  ACTIVE = 'ACTIVE',
  EXPIRED = 'EXPIRED',
  GRACE_PERIOD = 'GRACE_PERIOD'
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED'
}

export enum FileType {
  LAB_RESULT = 'LAB_RESULT',
  IMAGING = 'IMAGING',
  DOCTOR_NOTE = 'DOCTOR_NOTE',
  PRESCRIPTION = 'PRESCRIPTION'
}

export interface UserSummary {
  id: string;
  role: UserRole;
  fullName: string;
  email: string | null;
  phoneNumber: string;
  avatarUrl?: string | null;
  createdAt: string;
}

export interface DoctorProfileSummary {
  id: string;
  userId: string;
  specialty: string;
  subSpecialty?: string | null;
  licenseNumber: string;
  hospitalAffiliation?: string | null;
  yearsOfExperience: number;
  bio?: string | null;
  consultationFee: number;
  verificationStatus: DoctorStatus;
  rejectionReason?: string | null;
  documentUrls: string[];
  verifiedAt?: string | null;
  user: UserSummary;
}

export interface AvailabilitySlot {
  id: string;
  doctorId: string;
  dayOfWeek: number; // 0 = Sunday, 6 = Saturday
  startTime: string; // HH:mm
  endTime: string;   // HH:mm
  slotDurationMinutes: number;
  isActive: boolean;
}

export interface AppointmentDetail {
  id: string;
  patientId: string;
  doctorId: string;
  scheduledStart: string;
  scheduledEnd: string;
  status: AppointmentStatus;
  meetingChannelId: string;
  symptomsDescription?: string | null;
  patient?: UserSummary;
  doctor?: {
    id: string;
    fullName: string;
    phoneNumber: string;
    avatarUrl?: string | null;
    profile?: DoctorProfileSummary | null;
  };
  consultation?: ConsultationDetail | null;
  createdAt: string;
}

export interface PrescriptionItem {
  drugName: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions?: string;
}

export interface ConsultationDetail {
  id: string;
  appointmentId: string;
  doctorNotes?: string | null;
  patientSummary?: string | null;
  diagnosis?: string | null;
  prescriptions?: PrescriptionDetail[];
  createdAt: string;
}

export interface PrescriptionDetail {
  id: string;
  consultationId: string;
  patientId: string;
  doctorId: string;
  medications: PrescriptionItem[];
  pdfUrl?: string | null;
  createdAt: string;
}

export interface MedicalRecordItem {
  id: string;
  patientId: string;
  uploadedById: string;
  title: string;
  fileType: FileType;
  fileUrl: string;
  notes?: string | null;
  createdAt: string;
}

export interface SubscriptionInfo {
  id: string;
  patientId: string;
  status: SubscriptionStatus;
  trialStartsAt: string;
  trialEndsAt: string;
  daysRemainingInTrial: number;
  isAccessAllowed: boolean;
  nextBillingDue?: string | null;
  amountGhs: number;
}

export interface ChatMessageItem {
  id: string;
  appointmentId: string;
  senderId: string;
  message: string;
  attachmentUrl?: string | null;
  readAt?: string | null;
  createdAt: string;
  sender?: {
    id: string;
    fullName: string;
    role: UserRole;
  };
}
