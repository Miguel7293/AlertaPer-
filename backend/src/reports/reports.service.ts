import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InMemoryStore } from '../store/in-memory.store';
import { Report, ReportStatus } from '../store/types';
import { EvidenceDto, ItemDto, SubmitDto, UpdateReportDto } from './dto';

@Injectable()
export class ReportsService {
  constructor(private readonly store: InMemoryStore) {}

  private owned(userId: string, reportId: string): Report {
    const r = this.store.reports.find((x) => x.id === reportId);
    if (!r) throw new NotFoundException('Report not found');
    if (r.userId !== userId) throw new ForbiddenException();
    return r;
  }

  private setStatus(r: Report, to: ReportStatus, by: string, note?: string) {
    const from = r.status;
    r.status = to;
    r.updatedAt = Date.now();
    this.store.statusHistory.push({
      id: this.store.id(),
      reportId: r.id,
      fromStatus: from,
      toStatus: to,
      note: note ?? null,
      changedBy: by,
      changedAt: Date.now(),
    });
  }

  create(userId: string): Report {
    const now = Date.now();
    const report: Report = {
      id: this.store.id(),
      trackingCode: null,
      userId,
      type: null,
      status: 'DRAFT',
      occurredAt: null,
      department: null,
      province: null,
      district: null,
      locationRef: null,
      geoLat: null,
      geoLng: null,
      narrative: null,
      identityStatus: 'partial',
      riskFlag: false,
      assignedOfficerId: null,
      comisariaId: null,
      reviewedAt: null,
      reviewNotes: null,
      submittedAt: null,
      createdAt: now,
      updatedAt: now,
    };
    this.store.reports.push(report);
    this.store.statusHistory.push({
      id: this.store.id(),
      reportId: report.id,
      fromStatus: null,
      toStatus: 'DRAFT',
      note: 'Borrador creado',
      changedBy: userId,
      changedAt: now,
    });
    this.store.audit(userId, 'report.create', 'report', report.id, {});
    return report;
  }

  update(userId: string, reportId: string, dto: UpdateReportDto): Report {
    const r = this.owned(userId, reportId);
    if (r.status !== 'DRAFT') throw new BadRequestException('Report already submitted');
    Object.assign(r, dto);
    r.updatedAt = Date.now();
    return r;
  }

  addItem(userId: string, reportId: string, dto: ItemDto) {
    const r = this.owned(userId, reportId);
    const item = {
      id: this.store.id(),
      reportId: r.id,
      name: dto.name,
      brandModel: dto.brandModel ?? null,
      approxValue: dto.approxValue ?? null,
      serialImei: dto.serialImei ?? null,
    };
    this.store.reportItems.push(item);
    return item;
  }

  addEvidence(userId: string, reportId: string, dto: EvidenceDto) {
    const r = this.owned(userId, reportId);
    const ev = {
      id: this.store.id(),
      reportId: r.id,
      fileUrl: dto.fileUrl,
      fileType: dto.fileType ?? null,
      description: dto.description ?? null,
      uploadedAt: Date.now(),
    };
    this.store.evidence.push(ev);
    return ev;
  }

  submit(userId: string, reportId: string, dto: SubmitDto) {
    const r = this.owned(userId, reportId);
    if (r.status !== 'DRAFT') throw new BadRequestException('Report already submitted');
    if (!r.type) throw new BadRequestException('Selecciona el tipo (robo o hurto)');
    if (!r.narrative) throw new BadRequestException('Describe lo que ocurrió');

    // record consents
    for (const type of dto.consents) {
      this.store.consents.push({
        id: this.store.id(),
        userId,
        type: type as any,
        granted: true,
        textVersion: 'v1',
        grantedAt: Date.now(),
      });
    }

    // identity status drives the post-submit state (non-blocking)
    const citizen = this.store.citizens.find((c) => c.userId === userId);
    const identityStatus = citizen?.identityStatus ?? 'pending_review';
    r.identityStatus = identityStatus;
    r.riskFlag = identityStatus === 'pending_review';
    r.trackingCode = this.store.nextTrackingCode();
    r.submittedAt = Date.now();

    // attach any unlinked face captures to this report
    this.store.faceCaptures
      .filter((f) => f.userId === userId && !f.reportId)
      .forEach((f) => (f.reportId = r.id));

    const newStatus: ReportStatus = identityStatus === 'pending_review' ? 'IDENTITY_PENDING' : 'RECEIVED';
    this.setStatus(r, newStatus, userId, 'Denuncia enviada');

    const user = this.store.users.find((u) => u.id === userId);
    if (user) user.hasFiledBefore = true;

    this.store.audit(userId, 'report.submit', 'report', r.id, {
      trackingCode: r.trackingCode,
      identityStatus,
    });

    return {
      tracking_code: r.trackingCode,
      status: r.status,
      identity_status: r.identityStatus,
      risk_flag: r.riskFlag,
      receipt_url: `/reports/${r.id}/receipt`,
      next_steps:
        newStatus === 'IDENTITY_PENDING'
          ? 'Tu denuncia fue registrada y quedó pendiente de verificación de identidad. La policía la validará.'
          : 'Tu denuncia fue registrada. Usa tu código para hacer seguimiento.',
    };
  }

  list(userId: string) {
    return this.store.reports
      .filter((r) => r.userId === userId)
      .sort((a, b) => b.createdAt - a.createdAt)
      .map((r) => ({
        id: r.id,
        trackingCode: r.trackingCode,
        type: r.type,
        status: r.status,
        district: r.district,
        occurredAt: r.occurredAt,
        createdAt: r.createdAt,
      }));
  }

  detail(userId: string, reportId: string) {
    const r = this.owned(userId, reportId);
    return this.assemble(r);
  }

  receipt(userId: string, reportId: string) {
    const r = this.owned(userId, reportId);
    if (!r.trackingCode) throw new BadRequestException('Report not submitted yet');
    return {
      constancia: 'provisional',
      trackingCode: r.trackingCode,
      type: r.type,
      status: r.status,
      identityStatus: r.identityStatus,
      submittedAt: r.submittedAt,
      district: r.district,
      narrative: r.narrative,
      issuedAt: Date.now(),
      note: 'Constancia provisional generada por SEGURO (MVP). No reemplaza el documento oficial de la PNP.',
    };
  }

  // public tracking by code + dni
  track(code: string, dni: string) {
    const r = this.store.reports.find((x) => x.trackingCode === code);
    if (!r) throw new NotFoundException('No se encontró una denuncia con ese código');
    const owner = this.store.users.find((u) => u.id === r.userId);
    if (!owner || owner.dni !== dni) {
      throw new ForbiddenException('Los datos no coinciden');
    }
    const timeline = this.store.statusHistory
      .filter((s) => s.reportId === r.id)
      .sort((a, b) => a.changedAt - b.changedAt)
      .map((s) => ({ status: s.toStatus, note: s.note, at: s.changedAt }));
    return {
      trackingCode: r.trackingCode,
      type: r.type,
      status: r.status,
      district: r.district,
      occurredAt: r.occurredAt,
      timeline,
    };
  }

  private assemble(r: Report) {
    return {
      ...r,
      items: this.store.reportItems.filter((i) => i.reportId === r.id),
      evidence: this.store.evidence.filter((e) => e.reportId === r.id),
      faceCaptures: this.store.faceCaptures
        .filter((f) => f.reportId === r.id)
        .map((f) => ({ id: f.id, captureType: f.captureType, encrypted: true })),
      timeline: this.store.statusHistory
        .filter((s) => s.reportId === r.id)
        .sort((a, b) => a.changedAt - b.changedAt)
        .map((s) => ({ status: s.toStatus, note: s.note, at: s.changedAt })),
    };
  }
}
