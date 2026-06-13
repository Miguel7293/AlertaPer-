import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { InMemoryStore } from '../store/in-memory.store';
import { Citizen, IdentityStatus } from '../store/types';
import { BasicValidationDto, ConsentDto, FaceCaptureDto } from './dto';
import { isPlausibleIssueDate, isValidCheckDigit, isValidDniFormat } from './dni.util';

const UPLOAD_DIR = path.join(process.cwd(), 'uploads');

@Injectable()
export class IdentityService {
  constructor(
    private readonly store: InMemoryStore,
    private readonly config: ConfigService,
  ) {
    if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }

  private citizenOf(userId: string): Citizen {
    const c = this.store.citizens.find((x) => x.userId === userId);
    if (!c) throw new NotFoundException('Citizen profile not found');
    return c;
  }

  private record(
    userId: string,
    step: 'basic' | 'reniec' | 'contact' | 'face' | 'risk' | 'assisted',
    result: 'pass' | 'fail' | 'skipped',
    details: Record<string, unknown> = {},
  ) {
    const attemptNo =
      this.store.identityVerifications.filter((v) => v.userId === userId && v.step === step)
        .length + 1;
    this.store.identityVerifications.push({
      id: this.store.id(),
      userId,
      reportId: null,
      step,
      result,
      attemptNo,
      details,
      createdAt: Date.now(),
    });
    this.store.audit(userId, `identity.${step}.${result}`, 'identity_verification', userId, details);
    return attemptNo;
  }

  // Step 1 — basic validation (works without electronic DNI)
  basic(userId: string, dto: BasicValidationDto) {
    const citizen = this.citizenOf(userId);
    const reasons: string[] = [];

    if (!isValidDniFormat(dto.dni)) reasons.push('dni_format');
    if (dto.checkDigit != null && !isValidCheckDigit(dto.dni, dto.checkDigit)) {
      reasons.push('check_digit');
    }
    if (dto.dniIssueDate && !isPlausibleIssueDate(dto.dniIssueDate)) {
      reasons.push('issue_date');
    }
    if (!dto.checkDigit && !dto.dniIssueDate) reasons.push('need_issue_date_or_check_digit');

    const passed = reasons.length === 0;
    const attemptNo = this.record(userId, 'basic', passed ? 'pass' : 'fail', { reasons });

    citizen.birthDate = dto.birthDate;
    if (dto.dniIssueDate) citizen.dniIssueDate = dto.dniIssueDate;

    // Risk: too many failed attempts -> flag for assisted review (never hard-block)
    let riskFlag = false;
    if (!passed && attemptNo >= 3) {
      riskFlag = true;
      this.record(userId, 'risk', 'fail', { trigger: 'repeated_basic_failures', attemptNo });
    }

    citizen.identityStatus = passed ? 'partial' : 'pending_review';
    return {
      step: 'basic',
      passed,
      reasons,
      attempt: attemptNo,
      riskFlag,
      identityStatus: citizen.identityStatus,
    };
  }

  // Step 2 — mock RENIEC / PIDE (simulated; replace with real interoperability later)
  reniecCheck(userId: string) {
    const citizen = this.citizenOf(userId);
    // Mock rule: DNIs ending in 0 simulate a "no match" to exercise the fallback path.
    const match = !citizen.dni.endsWith('0');
    this.record(userId, 'reniec', match ? 'pass' : 'fail', { mock: true });
    if (match && citizen.identityStatus !== 'pending_review') {
      citizen.identityStatus = 'verified';
    }
    return {
      step: 'reniec',
      simulated: true,
      match,
      identityStatus: citizen.identityStatus,
      message: match
        ? 'Datos validados con RENIEC (simulado).'
        : 'No se pudo validar con RENIEC. Continúa con verificación asistida.',
    };
  }

  // Step 3 — custom OTP for contact verification
  async otpSend(userId: string, channel: 'email' | 'sms') {
    const code = String(Math.floor(100000 + Math.random() * 900000)); // 6 digits
    const codeHash = await bcrypt.hash(code, 10);
    this.store.otpCodes.push({
      id: this.store.id(),
      userId,
      channel,
      codeHash,
      purpose: 'contact_verify',
      attempts: 0,
      expiresAt: Date.now() + 5 * 60000,
      consumedAt: null,
    });
    this.store.audit(userId, 'identity.otp_sent', 'otp', userId, { channel });
    // DEMO ONLY: the real system delivers via SMS/email and never returns the code.
    return { sent: true, channel, devCode: code, expiresInSeconds: 300 };
  }

  async otpVerify(userId: string, code: string) {
    const otp = this.store.otpCodes
      .filter((o) => o.userId === userId && !o.consumedAt && o.expiresAt > Date.now())
      .sort((a, b) => b.expiresAt - a.expiresAt)[0];
    if (!otp) throw new BadRequestException('No active code. Request a new one.');
    if (otp.attempts >= 5) throw new BadRequestException('Too many attempts. Request a new code.');
    otp.attempts += 1;

    const ok = await bcrypt.compare(code, otp.codeHash);
    if (!ok) {
      this.record(userId, 'contact', 'fail', {});
      throw new BadRequestException('Invalid code');
    }
    otp.consumedAt = Date.now();
    const user = this.store.users.find((u) => u.id === userId);
    if (user) {
      if (otp.channel === 'email') user.emailVerified = true;
      else user.phoneVerified = true;
    }
    this.record(userId, 'contact', 'pass', { channel: otp.channel });
    return { verified: true, channel: otp.channel };
  }

  // Consent (must precede face capture)
  consent(userId: string, dto: ConsentDto) {
    const c = {
      id: this.store.id(),
      userId,
      type: dto.type,
      granted: true,
      textVersion: dto.textVersion,
      grantedAt: Date.now(),
    };
    this.store.consents.push(c);
    this.store.audit(userId, 'consent.granted', 'consent', c.id, { type: dto.type });
    return { consentId: c.id, type: dto.type, granted: true };
  }

  // Step 4 — facial capture (front + profile), encrypted at rest (AES-256-GCM)
  faceCapture(userId: string, dto: FaceCaptureDto) {
    const hasConsent = this.store.consents.some(
      (c) => c.userId === userId && c.type === 'face_biometric' && c.granted,
    );
    if (!hasConsent) {
      throw new BadRequestException('Face capture requires explicit biometric consent first');
    }

    const raw = dto.imageBase64.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(raw, 'base64');
    const keyHex = this.config.get<string>('FACE_ENCRYPTION_KEY') ?? '';
    const key = Buffer.from(keyHex, 'hex');
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const enc = Buffer.concat([cipher.update(buffer), cipher.final()]);
    const tag = cipher.getAuthTag();
    const blob = Buffer.concat([iv, tag, enc]); // iv(12) + tag(16) + ciphertext

    const fileName = `${userId}_${dto.captureType}_${Date.now()}.enc`;
    const filePath = path.join(UPLOAD_DIR, fileName);
    fs.writeFileSync(filePath, blob);

    const capture = {
      id: this.store.id(),
      reportId: dto.reportId ?? null,
      userId,
      captureType: dto.captureType,
      storageUrl: filePath,
      consentId: dto.consentId ?? null,
      capturedAt: Date.now(),
    };
    this.store.faceCaptures.push(capture);
    this.record(userId, 'face', 'pass', { captureType: dto.captureType });
    return {
      captureId: capture.id,
      captureType: capture.captureType,
      encrypted: true,
      message: 'Imagen cifrada y adjuntada a la denuncia.',
    };
  }

  status(userId: string): { identityStatus: IdentityStatus; steps: any[] } {
    const citizen = this.citizenOf(userId);
    const steps = this.store.identityVerifications
      .filter((v) => v.userId === userId)
      .map((v) => ({ step: v.step, result: v.result, attempt: v.attemptNo, at: v.createdAt }));
    return { identityStatus: citizen.identityStatus, steps };
  }
}
