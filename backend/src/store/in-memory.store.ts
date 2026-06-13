import { Injectable } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import {
  AuditLog,
  Citizen,
  Consent,
  Evidence,
  FaceCapture,
  IdentityVerification,
  OtpCode,
  Report,
  ReportItem,
  Session,
  StatusHistory,
  User,
} from './types';

// Single persistence seam for the whole app.
// Today: in-memory arrays. Later: replace each collection with a Prisma model
// pointed at Supabase Postgres — controllers/services don't change.
@Injectable()
export class InMemoryStore {
  users: User[] = [];
  sessions: Session[] = [];
  otpCodes: OtpCode[] = [];
  citizens: Citizen[] = [];
  reports: Report[] = [];
  reportItems: ReportItem[] = [];
  evidence: Evidence[] = [];
  faceCaptures: FaceCapture[] = [];
  identityVerifications: IdentityVerification[] = [];
  consents: Consent[] = [];
  statusHistory: StatusHistory[] = [];
  auditLog: AuditLog[] = [];

  private seq = 1000;

  id(): string {
    return uuid();
  }

  // Human-friendly tracking code: DEN-YYYY-0000000
  nextTrackingCode(): string {
    this.seq += 1;
    const year = new Date().getFullYear();
    return `DEN-${year}-${String(this.seq).padStart(7, '0')}`;
  }

  audit(actor: string, action: string, entity: string, entityId: string, meta: Record<string, unknown> = {}) {
    this.auditLog.push({
      id: this.id(),
      actor,
      action,
      entity,
      entityId,
      meta,
      createdAt: Date.now(),
    });
  }
}
