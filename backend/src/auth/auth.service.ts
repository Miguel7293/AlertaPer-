import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { Denunciante, ServidorPublico } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { audit } from '../common/audit.util';
import { ROLES, ROL_DESCRIPCION, SLUG_POR_DESCRIPCION } from '../store/roles';
import { ESTADOS } from '../store/estados';
import { CrearOficialDto, RegisterDto } from './dto';
import { EmailService } from './email.service';

// NOTE: bcryptjs is used for zero-native-build install reliability on Windows.
// docs/PLAN.md specifies Argon2id for production — swap here when ready.

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly email: EmailService,
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
        telefono: dto.telefono || null,
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
    const delivery = await this.email.sendVerificationCode(d.correoElectronico, codigo);
    await this.prisma.notificacion.create({
      data: {
        usuarioId,
        canal: 'email',
        plantilla: 'email_verify',
        estado: delivery.mode === 'smtp' ? 'sent' : 'mocked',
      },
    });
    audit(usuarioId, 'auth.email_code_sent', 'denunciante', usuarioId);
    return {
      sent: true,
      destino: d.correoElectronico,
      deliveryMode: delivery.mode,
      devCode: delivery.mode === 'demo' ? delivery.devCode : undefined,
      expiraEnSeg: 600,
    };
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

    await this.prisma.session.update({ where: { id: session.id }, data: { revokedAt: new Date() } });

    // tipo-aware: ciudadano u oficial viven en tablas distintas
    if (session.tipoUsuario === 'servidor_publico') {
      const sp = await this.prisma.servidorPublico.findUnique({ where: { id: payload.sub } });
      if (!sp) throw new UnauthorizedException('Usuario no encontrado');
      const pub = await this.publicServidor(sp);
      const tokens = await this.issueTokens(sp.id, pub.rol ?? 'servidor_publico', 'servidor_publico');
      return { ...tokens, user: pub };
    }

    const d = await this.prisma.denunciante.findUnique({ where: { id: payload.sub } });
    if (!d) throw new UnauthorizedException('Usuario no encontrado');
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

  // ---------------- SERVIDOR PÚBLICO (oficiales) ----------------

  async publicServidor(sp: ServidorPublico) {
    const rolRow = sp.role ? await this.prisma.rol.findUnique({ where: { id: sp.role } }) : null;
    const rolNombre = rolRow?.descripcion ?? null;
    const rol = rolNombre ? SLUG_POR_DESCRIPCION[rolNombre] ?? rolNombre : null;
    const comisaria = sp.comisariaId
      ? await this.prisma.comisaria.findUnique({ where: { id: sp.comisariaId } })
      : null;
    return {
      id: sp.id,
      tipo: 'servidor_publico' as const,
      usuario: sp.usuario,
      dni: sp.dni,
      correoElectronico: sp.correoElectronico,
      primerNombre: sp.primerNombre,
      apellidoPaterno: sp.apellidoPaterno,
      apellidoMaterno: sp.apellidoMaterno,
      telefono: sp.telefono,
      rol, // slug: super_admin | encargado_comisaria | policia | fiscal
      rolNombre, // nombre legible
      comisariaId: sp.comisariaId,
      comisaria: comisaria?.descripcion ?? null,
    };
  }

  async loginOficial(usuario: string, contrasena: string, ctx: { ua?: string; ip?: string }) {
    const sp = await this.prisma.servidorPublico.findFirst({
      where: { OR: [{ usuario }, { correoElectronico: usuario }, { dni: usuario }] },
    });
    if (!sp) throw new UnauthorizedException('Credenciales inválidas');
    if (!(await bcrypt.compare(contrasena, sp.contrasenaHash))) {
      audit(sp.id, 'auth.login_oficial_failed', 'servidor_publico', sp.id);
      throw new UnauthorizedException('Credenciales inválidas');
    }
    const pub = await this.publicServidor(sp);
    audit(sp.id, 'auth.login_oficial', 'servidor_publico', sp.id, { rol: pub.rol });
    const tokens = await this.issueTokens(sp.id, pub.rol ?? 'servidor_publico', 'servidor_publico', ctx);
    return { ...tokens, user: pub };
  }

  async meOficial(usuarioId: string) {
    const sp = await this.prisma.servidorPublico.findUnique({ where: { id: usuarioId } });
    if (!sp) throw new UnauthorizedException();
    return this.publicServidor(sp);
  }

  private async rolIdPorSlug(slug: string): Promise<string | null> {
    const descripcion = (ROL_DESCRIPCION as Record<string, string>)[slug];
    if (!descripcion) return null;
    const r = await this.prisma.rol.findFirst({ where: { descripcion } });
    return r?.id ?? null;
  }

  // Crear cuentas de oficiales (solo super_admin y encargado_comisaria).
  async crearOficial(creador: { id: string; role: string }, dto: CrearOficialDto) {
    let rolSlug: string;
    let comisariaId: string | null;

    if (creador.role === ROLES.SUPER_ADMIN) {
      rolSlug = dto.rol ?? ROLES.POLICIA;
      comisariaId = dto.comisariaId ?? null;
      if ((rolSlug === ROLES.POLICIA || rolSlug === ROLES.ENCARGADO_COMISARIA) && !comisariaId) {
        throw new BadRequestException('Selecciona una comisaría para este rol');
      }
      if (rolSlug === ROLES.FISCAL) comisariaId = null;
    } else if (creador.role === ROLES.ENCARGADO_COMISARIA) {
      // el encargado solo crea policías en SU comisaría
      const creadorSp = await this.prisma.servidorPublico.findUnique({ where: { id: creador.id } });
      if (!creadorSp?.comisariaId) throw new BadRequestException('Tu cuenta no tiene comisaría asignada');
      rolSlug = ROLES.POLICIA;
      comisariaId = creadorSp.comisariaId;
    } else {
      throw new ForbiddenException('No autorizado');
    }

    const exists = await this.prisma.servidorPublico.findFirst({
      where: { OR: [{ usuario: dto.usuario }, { correoElectronico: dto.correoElectronico }, { dni: dto.dni }] },
    });
    if (exists) throw new ConflictException('Ya existe un oficial con ese usuario, correo o DNI');

    const sp = await this.prisma.servidorPublico.create({
      data: {
        usuario: dto.usuario,
        correoElectronico: dto.correoElectronico,
        dni: dto.dni,
        primerNombre: dto.primerNombre,
        apellidoPaterno: dto.apellidoPaterno,
        apellidoMaterno: dto.apellidoMaterno,
        contrasenaHash: await bcrypt.hash(dto.contrasena, 10),
        role: await this.rolIdPorSlug(rolSlug),
        comisariaId,
      },
    });
    audit(creador.id, 'oficial.crear', 'servidor_publico', sp.id, { rol: rolSlug, comisariaId });
    return this.publicServidor(sp);
  }

  async listarOficiales(solicitante: { id: string; role: string }) {
    let sps;
    if (solicitante.role === ROLES.SUPER_ADMIN) {
      sps = await this.prisma.servidorPublico.findMany({ orderBy: { creadoEn: 'desc' } });
    } else if (solicitante.role === ROLES.ENCARGADO_COMISARIA) {
      const sp = await this.prisma.servidorPublico.findUnique({ where: { id: solicitante.id } });
      sps = await this.prisma.servidorPublico.findMany({
        where: { comisariaId: sp?.comisariaId ?? '' },
        orderBy: { creadoEn: 'desc' },
      });
    } else {
      throw new ForbiddenException('No autorizado');
    }
    return Promise.all(sps.map((s) => this.publicServidor(s)));
  }

  async listarComisarias() {
    const cs = await this.prisma.comisaria.findMany({ orderBy: { descripcion: 'asc' } });
    return cs.map((c) => ({ id: c.id, descripcion: c.descripcion, distrito: c.distrito }));
  }

  async resumenOficial(solicitante: { id: string; role: string }) {
    const servidor = await this.prisma.servidorPublico.findUnique({
      where: { id: solicitante.id },
    });
    if (!servidor) throw new UnauthorizedException('Servidor público no encontrado');

    const where: any = { enviadoEn: { not: null } };
    if (
      solicitante.role === ROLES.ENCARGADO_COMISARIA ||
      solicitante.role === ROLES.POLICIA
    ) {
      if (!servidor.comisariaId) {
        return {
          metricas: { total: 0, recibidas: 0, investigacion: 0, resueltas: 0 },
          recientes: [],
        };
      }
      where.comisariaId = servidor.comisariaId;
    }

    if (solicitante.role === ROLES.FISCAL) {
      const asignaciones = await this.prisma.servidorDenuncia.findMany({
        where: { servidorPublico: servidor.id, fechaSalida: null },
        select: { denuncia: true },
      });
      where.id = { in: asignaciones.map((a) => a.denuncia) };
    }

    const [estados, comisarias] = await Promise.all([
      this.prisma.estado.findMany(),
      this.prisma.comisaria.findMany(),
    ]);

    const estadoPorId = new Map(estados.map((e) => [e.id, e.descripcion]));
    const idPorEstado = new Map(estados.map((e) => [e.descripcion, e.id]));
    const comisariaPorId = new Map(comisarias.map((c) => [c.id, c.descripcion]));
    const descripcionEstado = (estadoId: string | null) =>
      estadoId ? estadoPorId.get(estadoId) ?? 'Sin estado' : 'Borrador';

    const withEstado = (descripcion: string) => {
      const estadoId = idPorEstado.get(descripcion);
      return estadoId ? { ...where, estadoId } : { ...where, id: { in: [] } };
    };

    const [total, recibidas, investigacion, resueltas, denuncias] = await Promise.all([
      this.prisma.denuncia.count({ where }),
      this.prisma.denuncia.count({ where: withEstado(ESTADOS.RECIBIDA) }),
      this.prisma.denuncia.count({ where: withEstado(ESTADOS.EN_INVESTIGACION) }),
      this.prisma.denuncia.count({ where: withEstado(ESTADOS.RESUELTA) }),
      this.prisma.denuncia.findMany({
        where,
        orderBy: { actualizadoEn: 'desc' },
        take: 50,
      }),
    ]);

    return {
      metricas: { total, recibidas, investigacion, resueltas },
      recientes: denuncias.map((d) => ({
        id: d.id,
        codigoSeguimiento: d.codigoSeguimiento,
        tipo: d.tipo,
        estado: descripcionEstado(d.estadoId),
        distrito: d.distrito,
        comisaria: d.comisariaId ? comisariaPorId.get(d.comisariaId) ?? null : null,
        enviadoEn: d.enviadoEn,
        actualizadoEn: d.actualizadoEn,
      })),
    };
  }
}
