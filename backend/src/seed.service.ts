import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { InMemoryStore } from './store/in-memory.store';

// Seeds a demo complainant so the login screen works out of the box.
// Demo credentials:  DNI 12345678 / password Demo1234
@Injectable()
export class SeedService implements OnModuleInit {
  private readonly logger = new Logger('Seed');

  constructor(private readonly store: InMemoryStore) {}

  async onModuleInit() {
    if (this.store.users.length > 0) return;
    const passwordHash = await bcrypt.hash('Demo1234', 10);
    const userId = this.store.id();
    this.store.users.push({
      id: userId,
      role: 'denunciante',
      email: 'demo@seguro.pe',
      phone: '+51999999999',
      dni: '12345678',
      passwordHash,
      emailVerified: true,
      phoneVerified: true,
      failedLoginCount: 0,
      lockedUntil: null,
      hasFiledBefore: true,
      tutorialCompletedAt: Date.now(),
      createdAt: Date.now(),
    });
    this.store.citizens.push({
      id: this.store.id(),
      userId,
      dni: '12345678',
      firstName: 'Demo',
      lastName: 'Usuario',
      birthDate: '1990-05-12',
      dniIssueDate: '2015-03-01',
      identityStatus: 'verified',
    });

    // a pre-submitted report so public tracking can be demoed immediately
    const reportId = this.store.id();
    const code = this.store.nextTrackingCode();
    const now = Date.now();
    this.store.reports.push({
      id: reportId,
      trackingCode: code,
      userId,
      type: 'robo',
      status: 'IDENTITY_PENDING',
      occurredAt: '2026-06-12',
      department: 'Lima',
      province: 'Lima',
      district: 'Miraflores',
      locationRef: 'Av. Larco con Av. Benavides',
      geoLat: null,
      geoLng: null,
      narrative: 'Me sustrajeron el celular con violencia mientras caminaba.',
      identityStatus: 'verified',
      riskFlag: false,
      assignedOfficerId: null,
      comisariaId: null,
      reviewedAt: null,
      reviewNotes: null,
      submittedAt: now,
      createdAt: now,
      updatedAt: now,
    });
    this.store.statusHistory.push(
      { id: this.store.id(), reportId, fromStatus: null, toStatus: 'DRAFT', note: 'Borrador creado', changedBy: userId, changedAt: now - 60000 },
      { id: this.store.id(), reportId, fromStatus: 'DRAFT', toStatus: 'RECEIVED', note: 'Denuncia enviada', changedBy: userId, changedAt: now - 30000 },
      { id: this.store.id(), reportId, fromStatus: 'RECEIVED', toStatus: 'IDENTITY_PENDING', note: 'Pendiente de verificación de identidad', changedBy: 'system', changedAt: now },
    );

    this.logger.log(`Seeded demo user (DNI 12345678 / Demo1234) and report ${code}`);
  }
}
