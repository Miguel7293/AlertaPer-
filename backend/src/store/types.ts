// Domain types mirror docs/PLAN.md section 18.
// These are the shapes the future Prisma/Supabase models must satisfy.

export type IdentityStatus = 'verified' | 'partial' | 'pending_review';

export type ReportStatus =
  | 'DRAFT'
  | 'RECEIVED'
  | 'IDENTITY_PENDING'
  | 'UNDER_REVIEW'
  | 'ASSIGNED'
  | 'INFO_REQUESTED'
  | 'IN_PROGRESS'
  | 'RESOLVED'
  | 'REJECTED';

export interface User {
  id: string;
  role: 'denunciante' | 'police';
  email: string | null;
  phone: string | null;
  dni: string;
  passwordHash: string;
  emailVerified: boolean;
  phoneVerified: boolean;
  failedLoginCount: number;
  lockedUntil: number | null; // epoch ms
  hasFiledBefore: boolean;
  tutorialCompletedAt: number | null;
  createdAt: number;
}

export interface Session {
  id: string;
  userId: string;
  refreshTokenHash: string;
  userAgent: string | null;
  ip: string | null;
  expiresAt: number;
  revokedAt: number | null;
  createdAt: number;
}

export interface OtpCode {
  id: string;
  userId: string;
  channel: 'email' | 'sms';
  codeHash: string;
  purpose: 'contact_verify' | 'login_step';
  attempts: number;
  expiresAt: number;
  consumedAt: number | null;
}

export interface Citizen {
  id: string;
  userId: string;
  dni: string;
  firstName: string | null;
  lastName: string | null;
  birthDate: string | null; // ISO date
  dniIssueDate: string | null;
  identityStatus: IdentityStatus;
}

export interface ReportItem {
  id: string;
  reportId: string;
  name: string;
  brandModel: string | null;
  approxValue: number | null;
  serialImei: string | null;
}

export interface Evidence {
  id: string;
  reportId: string;
  fileUrl: string;
  fileType: string | null;
  description: string | null;
  uploadedAt: number;
}

export interface FaceCapture {
  id: string;
  reportId: string | null;
  userId: string;
  captureType: 'front' | 'profile';
  storageUrl: string; // path to encrypted blob on disk
  consentId: string | null;
  capturedAt: number;
}

export interface IdentityVerification {
  id: string;
  userId: string;
  reportId: string | null;
  step: 'basic' | 'reniec' | 'contact' | 'face' | 'risk' | 'assisted';
  result: 'pass' | 'fail' | 'skipped';
  attemptNo: number;
  details: Record<string, unknown>;
  createdAt: number;
}

export interface Consent {
  id: string;
  userId: string;
  type: 'face_biometric' | 'data_processing' | 'truthfulness';
  granted: boolean;
  textVersion: string;
  grantedAt: number;
}

export interface StatusHistory {
  id: string;
  reportId: string;
  fromStatus: ReportStatus | null;
  toStatus: ReportStatus;
  note: string | null;
  changedBy: string; // userId or 'system'
  changedAt: number;
}

export interface AuditLog {
  id: string;
  actor: string; // userId or 'system'
  action: string;
  entity: string;
  entityId: string;
  meta: Record<string, unknown>;
  createdAt: number;
}

export interface Report {
  id: string;
  trackingCode: string | null;
  userId: string;
  type: 'robo' | 'hurto' | null;
  status: ReportStatus;
  occurredAt: string | null;
  department: string | null;
  province: string | null;
  district: string | null;
  locationRef: string | null;
  geoLat: number | null;
  geoLng: number | null;
  narrative: string | null;
  identityStatus: IdentityStatus;
  riskFlag: boolean;
  // reserved for the future police back-office (nullable now)
  assignedOfficerId: string | null;
  comisariaId: string | null;
  reviewedAt: number | null;
  reviewNotes: string | null;
  submittedAt: number | null;
  createdAt: number;
  updatedAt: number;
}
