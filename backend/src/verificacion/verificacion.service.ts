import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { PrismaService } from '../prisma/prisma.service';
import { audit } from '../common/audit.util';
import { CapturaFacialDto, ConsentimientoDto } from './dto';

const UPLOAD_DIR = path.join(process.cwd(), 'uploads');

@Injectable()
export class VerificacionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }

  private async record(
    usuarioId: string,
    paso: 'basic' | 'reniec' | 'contact' | 'face' | 'risk' | 'assisted',
    resultado: 'pass' | 'fail' | 'skipped',
    detalles: Record<string, unknown> = {},
  ) {
    const numeroIntento =
      (await this.prisma.verificacionIdentidad.count({ where: { usuarioId, paso } })) + 1;
    await this.prisma.verificacionIdentidad.create({
      data: { usuarioId, paso, resultado, numeroIntento, detalles: detalles as any },
    });
  }

  async consentimiento(usuarioId: string, dto: ConsentimientoDto) {
    const c = await this.prisma.consentimiento.create({
      data: { usuarioId, tipo: dto.tipo, concedido: true, versionTexto: dto.versionTexto },
    });
    audit(usuarioId, 'consentimiento.concedido', 'consentimiento', c.id, { tipo: dto.tipo });
    return { consentimientoId: c.id, tipo: dto.tipo, concedido: true };
  }

  async capturaFacial(usuarioId: string, dto: CapturaFacialDto) {
    const tieneConsentimiento = await this.prisma.consentimiento.findFirst({
      where: { usuarioId, tipo: 'face_biometric', concedido: true },
    });
    if (!tieneConsentimiento) {
      throw new BadRequestException('La captura facial requiere consentimiento biométrico previo');
    }

    const raw = dto.imagenBase64.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(raw, 'base64');
    const key = Buffer.from(this.config.get<string>('FACE_ENCRYPTION_KEY') ?? '', 'hex');
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const enc = Buffer.concat([cipher.update(buffer), cipher.final()]);
    const tag = cipher.getAuthTag();
    const blob = Buffer.concat([iv, tag, enc]);

    const fileName = `${usuarioId}_${dto.tipoCaptura}_${Date.now()}.enc`;
    const filePath = path.join(UPLOAD_DIR, fileName);
    fs.writeFileSync(filePath, blob);

    const captura = await this.prisma.capturaFacial.create({
      data: {
        usuarioId,
        tipoCaptura: dto.tipoCaptura,
        urlAlmacenamiento: filePath,
        consentimientoId: dto.consentimientoId ?? null,
      },
    });
    await this.record(usuarioId, 'face', 'pass', { tipoCaptura: dto.tipoCaptura });
    audit(usuarioId, 'verificacion.captura_facial', 'captura_facial', captura.id, {
      tipoCaptura: dto.tipoCaptura,
    });

    const caps = await this.prisma.capturaFacial.findMany({ where: { usuarioId } });
    const facialCompleto = caps.some((c) => c.tipoCaptura === 'front') && caps.length >= 2;
    if (facialCompleto) await this.reniec(usuarioId);

    return {
      capturaId: captura.id,
      tipoCaptura: captura.tipoCaptura,
      cifrado: true,
      facialCompleto,
      totalCapturas: caps.length,
    };
  }

  // Mock RENIEC/PIDE — simulated. DNIs ending in 0 emulate a "no match".
  async reniec(usuarioId: string) {
    const d = await this.prisma.denunciante.findUnique({ where: { id: usuarioId } });
    if (!d) throw new UnauthorizedException();
    const match = !d.dni.endsWith('0');
    await this.record(usuarioId, 'reniec', match ? 'pass' : 'fail', { simulado: true });
    const estadoIdentidad = match ? 'verified' : 'pending_review';
    await this.prisma.denunciante.update({ where: { id: usuarioId }, data: { estadoIdentidad } });
    if (!match) await this.record(usuarioId, 'assisted', 'skipped', { motivo: 'reniec_no_match' });
    audit(usuarioId, 'verificacion.reniec', 'denunciante', usuarioId, { match });
    return {
      simulado: true,
      match,
      estadoIdentidad,
      mensaje: match
        ? 'Identidad verificada (RENIEC simulado).'
        : 'No se pudo validar con RENIEC. Tu identidad quedará en revisión asistida.',
    };
  }

  async estado(usuarioId: string) {
    const d = await this.prisma.denunciante.findUnique({ where: { id: usuarioId } });
    if (!d) throw new UnauthorizedException();
    const caps = await this.prisma.capturaFacial.findMany({ where: { usuarioId } });
    const facialCompleto = caps.some((c) => c.tipoCaptura === 'front') && caps.length >= 2;
    const pasos = await this.prisma.verificacionIdentidad.findMany({ where: { usuarioId } });
    return {
      estadoIdentidad: d.estadoIdentidad,
      correoVerificado: d.correoVerificado,
      facialCompleto,
      totalCapturas: caps.length,
      onboardingCompleto: d.correoVerificado && facialCompleto,
      pasos: pasos.map((v) => ({ paso: v.paso, resultado: v.resultado, intento: v.numeroIntento, en: v.creadoEn })),
    };
  }
}
