import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { Denunciante } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { audit } from '../common/audit.util';
import { RegisterDto } from './dto';

// NOTE: bcryptjs is used for zero-native-build install reliability on Windows.
// docs/PLAN.md specifies Argon2id for production — swap here when ready.

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  private async facialCompleto(usuarioId: string): Promise<boolean> {
    const caps = await this.prisma.capturaFacial.findMany({ where: { usuarioId } });
    return caps.some((c) => c.tipoCaptura === 'front') && caps.length >= 2;
  }

  async publicUser(d: Denunciante) {
    const facialCompleto = await this.facialCompleto(d.id);
    return {
      id: d.id,
      tipo: 'denunciante' as const,
      dni: d.dni,
      correoElectronico: d.correoElectronico,
      primerNombre: d.primerNombre,
      apellidoPaterno: d.apellidoPaterno,
      apellidoMaterno: d.apellidoMaterno,
      telefono: d.telefono,
      correoVerificado: d.correoVerificado,
      telefonoVerificado: d.telefonoVerificado,
      haDenunciadoAntes: d.haDenunciadoAntes,
      estadoIdentidad: d.estadoIdentidad,
      facialCompleto,
      onboardingCompleto: d.correoVerificado && facialCompleto,
    };
  }

  async register(dto: RegisterDto) {
    const exists = await this.prisma.denunciante.findFirst({
      where: { OR: [{ dni: dto.dni }, { correoElectronico: dto.correoElectronico }] },
    });
    if (exists) throw new ConflictException('Ya existe una cuenta con ese DNI o correo');

    const d = await this.prisma.denunciante.create({
      data: {
        correoElectronico: dto.correoElectronico,
        dni: dto.dni,
        primerNombre: dto.primerNombre,
        apellidoPaterno: dto.apellidoPaterno,
        apellidoMaterno: dto.apellidoMaterno,
        fechaNacimiento: new Date(dto.fechaNacimiento),
        fechaEmisionDni: dto.fechaEmisionDni ? new Date(dto.fechaEmisionDni) : null,
        telefono: dto.telefono ?? null,
        estadoIdentidad: 'partial',
        contrasenaHash: await bcrypt.hash(dto.contrasena, 10),
      },
    });
    audit(d.id, 'auth.register', 'denunciante', d.id, { dni: d.dni });

    const tokens = await this.issueTokens(d.id, 'denunciante', 'denunciante');
    return { ...tokens, user: await this.publicUser(d) };
  }

  async login(identificador: string, contrasena: string, ctx: { ua?: string; ip?: string }) {
    const d = await this.prisma.denunciante.findFirst({
      where: { OR: [{ dni: identificador }, { correoElectronico: identificador }] },
    });
    if (!d) throw new UnauthorizedException('Credenciales inválidas');

    const ok = await bcrypt.compare(contrasena, d.contrasenaHash);
    if (!ok) {
      audit(d.id, 'auth.login_failed', 'denunciante', d.id);
      throw new UnauthorizedException('Credenciales inválidas');
    }
    audit(d.id, 'auth.login', 'denunciante', d.id, { ip: ctx.ip ?? null });
    const tokens = await this.issueTokens(d.id, 'denunciante', 'denunciante', ctx);
    return { ...tokens, user: await this.publicUser(d) };
  }

  async emailSend(usuarioId: string) {
    const d = await this.prisma.denunciante.findUnique({ where: { id: usuarioId } });
    if (!d) throw new UnauthorizedException();
    if (d.correoVerificado) return { sent: false, alreadyVerified: true };

    const codigo = String(Math.floor(100000 + Math.random() * 900000));
    await this.prisma.otpCode.create({
      data: {
        usuarioId,
        canal: 'email',
        codeHash: await bcrypt.hash(codigo, 10),
        proposito: 'email_verify',
        expiraEn: new Date(Date.now() + 10 * 60000),
      },
    });
    await this.prisma.notificacion.create({
      data: { usuarioId, canal: 'email', plantilla: 'email_verify', estado: 'mocked' },
    });
    audit(usuarioId, 'auth.email_code_sent', 'denunciante', usuarioId);
    return { sent: true, destino: d.correoElectronico, devCode: codigo, expiraEnSeg: 600 };
  }

  async emailVerify(usuarioId: string, codigo: string) {
    const otp = await this.prisma.otpCode.findFirst({
      where: { usuarioId, proposito: 'email_verify', consumidoEn: null, expiraEn: { gt: new Date() } },
      orderBy: { expiraEn: 'desc' },
    });
    if (!otp) throw new BadRequestException('No hay código activo. Solicita uno nuevo.');
    if (otp.intentos >= 5) throw new BadRequestException('Demasiados intentos. Solicita un nuevo código.');
    await this.prisma.otpCode.update({ where: { id: otp.id }, data: { intentos: otp.intentos + 1 } });

    if (!(await bcrypt.compare(codigo, otp.codeHash))) {
      throw new BadRequestException('Código incorrecto');
    }
    await this.prisma.otpCode.update({ where: { id: otp.id }, data: { consumidoEn: new Date() } });
    const d = await this.prisma.denunciante.update({
      where: { id: usuarioId },
      data: { correoVerificado: true },
    });
    audit(usuarioId, 'auth.email_verified', 'denunciante', usuarioId);
    return { verificado: true, user: await this.publicUser(d) };
  }

  async issueTokens(
    usuarioId: string,
    role: string,
    tipo: 'denunciante' | 'servidor_publico',
    ctx: { ua?: string; ip?: string } = {},
  ) {
    const accessTtl = Number(this.config.get('ACCESS_TOKEN_TTL') ?? 900);
    const access_token = await this.jwt.signAsync(
      { sub: usuarioId, role, tipo },
      { secret: this.config.get('JWT_ACCESS_SECRET'), expiresIn: accessTtl },
    );

    const refreshDays = Number(this.config.get('REFRESH_TOKEN_TTL_DAYS') ?? 7);
    // create the session first to embed its id in the refresh token
    const session = await this.prisma.session.create({
      data: {
        usuarioId,
        tipoUsuario: tipo,
        refreshTokenHash: 'pending',
        userAgent: ctx.ua ?? null,
        ip: ctx.ip ?? null,
        expiresAt: new Date(Date.now() + refreshDays * 86400000),
      },
    });
    const refresh_token = await this.jwt.signAsync(
      { sub: usuarioId, sid: session.id, tipo },
      { secret: this.config.get('JWT_REFRESH_SECRET'), expiresIn: `${refreshDays}d` },
    );
    await this.prisma.session.update({
      where: { id: session.id },
      data: { refreshTokenHash: await bcrypt.hash(refresh_token, 10) },
    });
    return { access_token, refresh_token, token_type: 'Bearer', expires_in: accessTtl };
  }

  async refresh(refreshToken: string | undefined) {
    if (!refreshToken) throw new UnauthorizedException('Sin token de refresco');
    let payload: any;
    try {
      payload = await this.jwt.verifyAsync(refreshToken, {
        secret: this.config.get('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Token de refresco inválido');
    }
    const session = await this.prisma.session.findUnique({ where: { id: payload.sid } });
    if (!session || session.revokedAt || session.expiresAt.getTime() < Date.now()) {
      throw new UnauthorizedException('Sesión expirada');
    }
    if (!(await bcrypt.compare(refreshToken, session.refreshTokenHash))) {
      throw new UnauthorizedException('Token de refresco inválido');
    }
    const d = await this.prisma.denunciante.findUnique({ where: { id: payload.sub } });
    if (!d) throw new UnauthorizedException('Usuario no encontrado');

    await this.prisma.session.update({ where: { id: session.id }, data: { revokedAt: new Date() } });
    const tokens = await this.issueTokens(d.id, 'denunciante', 'denunciante');
    return { ...tokens, user: await this.publicUser(d) };
  }

  async logout(refreshToken: string | undefined) {
    if (!refreshToken) return { ok: true };
    try {
      const payload: any = await this.jwt.verifyAsync(refreshToken, {
        secret: this.config.get('JWT_REFRESH_SECRET'),
      });
      const session = await this.prisma.session.findUnique({ where: { id: payload.sid } });
      if (session && !session.revokedAt) {
        await this.prisma.session.update({ where: { id: session.id }, data: { revokedAt: new Date() } });
      }
    } catch {
      // best-effort
    }
    return { ok: true };
  }

  async me(usuarioId: string) {
    const d = await this.prisma.denunciante.findUnique({ where: { id: usuarioId } });
    if (!d) throw new UnauthorizedException();
    return this.publicUser(d);
  }
}
