import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Denuncia } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ESTADOS } from '../store/estados';
import { audit } from '../common/audit.util';
import {
  ActualizarDenunciaDto,
  EnviarDto,
  EvidenciaDto,
  ObjetoDto,
  SospechosoDto,
  TestigoDto,
} from './dto';

@Injectable()
export class DenunciasService {
  constructor(private readonly prisma: PrismaService) {}

  private async propia(usuarioId: string, id: string): Promise<Denuncia> {
    const d = await this.prisma.denuncia.findUnique({ where: { id } });
    if (!d) throw new NotFoundException('Denuncia no encontrada');
    if (d.usuarioId !== usuarioId) throw new ForbiddenException();
    return d;
  }

  private async estadoDescripcion(estadoId: string | null): Promise<string | null> {
    if (!estadoId) return null;
    const e = await this.prisma.estado.findUnique({ where: { id: estadoId } });
    return e?.descripcion ?? null;
  }

  private async estadoIdPorDescripcion(descripcion: string): Promise<string | null> {
    const e = await this.prisma.estado.findFirst({ where: { descripcion } });
    return e?.id ?? null;
  }

  private async nextCodigo(): Promise<string> {
    const count = await this.prisma.denuncia.count({ where: { codigoSeguimiento: { not: null } } });
    const year = new Date().getFullYear();
    return `DEN-${year}-${String(1001 + count).padStart(7, '0')}`;
  }

  // Current office = last servidor_denuncia row still open, else most recent.
  private async oficinaActual(denunciaId: string) {
    const movimientos = await this.prisma.servidorDenuncia.findMany({
      where: { denuncia: denunciaId },
      orderBy: { fechaIngreso: 'asc' },
    });
    const abierta = [...movimientos].reverse().find((s) => !s.fechaSalida);
    const actual = abierta ?? movimientos[movimientos.length - 1];
    if (!actual) return null;
    const oficina = await this.prisma.oficina.findUnique({ where: { id: actual.oficina } });
    return { oficina: oficina?.descripcion ?? null, desde: actual.fechaIngreso, comentario: actual.comentario };
  }

  private async movimientos(denunciaId: string) {
    const rows = await this.prisma.servidorDenuncia.findMany({
      where: { denuncia: denunciaId },
      orderBy: { fechaIngreso: 'asc' },
    });
    const oficinas = await this.prisma.oficina.findMany();
    const mapa = new Map(oficinas.map((o) => [o.id, o.descripcion]));
    return rows.map((s) => ({
      oficina: mapa.get(s.oficina) ?? null,
      ingreso: s.fechaIngreso,
      salida: s.fechaSalida,
      comentario: s.comentario,
    }));
  }

  crear(usuarioId: string) {
    audit(usuarioId, 'denuncia.crear', 'denuncia', 'new');
    return this.prisma.denuncia.create({ data: { usuarioId } });
  }

  async actualizar(usuarioId: string, id: string, dto: ActualizarDenunciaDto) {
    const d = await this.propia(usuarioId, id);
    if (d.enviadoEn) throw new BadRequestException('La denuncia ya fue enviada');
    const data: any = { actualizadoEn: new Date() };
    if (dto.tipo !== undefined) data.tipo = dto.tipo;
    if (dto.hora !== undefined) data.hora = dto.hora ? new Date(dto.hora) : null;
    if (dto.departamento !== undefined) data.departamento = dto.departamento;
    if (dto.provincia !== undefined) data.provincia = dto.provincia;
    if (dto.distrito !== undefined) data.distrito = dto.distrito;
    if (dto.referenciaUbicacion !== undefined) data.referenciaUbicacion = dto.referenciaUbicacion;
    if (dto.geoLatitud !== undefined) data.geoLatitud = dto.geoLatitud;
    if (dto.geoLongitud !== undefined) data.geoLongitud = dto.geoLongitud;
    if (dto.narrativa !== undefined) data.narrativa = dto.narrativa;
    if (dto.observoSospechosos !== undefined) data.observoSospechosos = dto.observoSospechosos;
    if (dto.huboTestigos !== undefined) data.huboTestigos = dto.huboTestigos;
    return this.prisma.denuncia.update({ where: { id }, data });
  }

  async agregarObjeto(usuarioId: string, id: string, dto: ObjetoDto) {
    await this.propia(usuarioId, id);
    if (!dto.nombre.trim() || !dto.marcaModelo.trim()) {
      throw new BadRequestException('Completa el nombre y la marca o característica del objeto');
    }
    return this.prisma.objetoRobado.create({
      data: {
        denunciaId: id,
        nombre: dto.nombre.trim(),
        marcaModelo: dto.marcaModelo.trim(),
        valorAproximado: dto.valorAproximado,
        descripcion: dto.descripcion ?? null,
      },
    });
  }

  async agregarSospechoso(usuarioId: string, id: string, dto: SospechosoDto) {
    await this.propia(usuarioId, id);
    if (!dto.descripcionPersonal.trim() || !dto.descripcionHuida.trim()) {
      throw new BadRequestException('Completa la descripción y la forma de huida');
    }
    return this.prisma.sospechoso.create({
      data: {
        denuncia: id,
        descripcionPersonal: dto.descripcionPersonal.trim(),
        descripcionHuida: dto.descripcionHuida.trim(),
      },
    });
  }

  async agregarTestigo(usuarioId: string, id: string, dto: TestigoDto) {
    await this.propia(usuarioId, id);
    if (!dto.nombre.trim()) throw new BadRequestException('Completa el nombre del testigo');
    return this.prisma.testigo.create({
      data: {
        denuncia: id,
        nombre: dto.nombre.trim(),
        relacion: dto.relacion,
        correo: dto.correo ?? null,
        telefono: dto.telefono,
      },
    });
  }

  async agregarEvidencia(usuarioId: string, id: string, dto: EvidenciaDto) {
    await this.propia(usuarioId, id);
    return this.prisma.evidencia.create({
      data: { denunciaId: id, urlArchivo: dto.urlArchivo, tipoArchivo: dto.tipoArchivo ?? null, descripcion: dto.descripcion ?? null },
    });
  }

  async enviar(usuarioId: string, id: string, dto: EnviarDto) {
    const d = await this.propia(usuarioId, id);
    if (d.enviadoEn) throw new BadRequestException('La denuncia ya fue enviada');
    if (!d.tipo) throw new BadRequestException('Selecciona el tipo (robo o hurto)');
    if (!d.hora) throw new BadRequestException('Indica la fecha y hora del hecho');
    if (d.hora.getTime() > Date.now()) throw new BadRequestException('La fecha del hecho no puede estar en el futuro');
    if (!d.departamento?.trim()) throw new BadRequestException('Indica el departamento');
    if (!d.provincia?.trim()) throw new BadRequestException('Indica la provincia');
    if (!d.distrito?.trim()) throw new BadRequestException('Indica el distrito');
    if (!d.referenciaUbicacion?.trim()) throw new BadRequestException('Indica una referencia del lugar');
    if (!d.narrativa || d.narrativa.trim().length < 30) {
      throw new BadRequestException('Describe lo ocurrido con al menos 30 caracteres');
    }
    if (d.observoSospechosos === null) {
      throw new BadRequestException('Indica si observaste a los sospechosos');
    }
    if (d.huboTestigos === null) {
      throw new BadRequestException('Indica si hubo testigos');
    }

    const [objetos, sospechosos, testigos] = await Promise.all([
      this.prisma.objetoRobado.count({ where: { denunciaId: id } }),
      this.prisma.sospechoso.count({ where: { denuncia: id } }),
      this.prisma.testigo.count({ where: { denuncia: id } }),
    ]);
    if (objetos < 1) throw new BadRequestException('Registra al menos un objeto sustraído');
    if (d.observoSospechosos && sospechosos < 1) {
      throw new BadRequestException('Completa la descripción de los sospechosos');
    }
    if (d.huboTestigos && testigos < 1) {
      throw new BadRequestException('Registra al menos un testigo');
    }
    if (!dto.consentimientos.includes('truthfulness') || !dto.consentimientos.includes('data_processing')) {
      throw new BadRequestException('Debes aceptar la declaración y el tratamiento de datos');
    }

    let consentimientoId: string | null = null;
    for (const tipo of dto.consentimientos) {
      const c = await this.prisma.consentimiento.create({
        data: { usuarioId, tipo, concedido: true, versionTexto: 'v1' },
      });
      if (tipo === 'truthfulness') consentimientoId = c.id;
    }

    const denunciante = await this.prisma.denunciante.findUnique({ where: { id: usuarioId } });
    const pendiente = denunciante?.estadoIdentidad === 'pending_review';
    const estadoId = await this.estadoIdPorDescripcion(
      pendiente ? ESTADOS.IDENTIDAD_PENDIENTE : ESTADOS.RECIBIDA,
    );

    const comisaria =
      (d.distrito &&
        (await this.prisma.comisaria.findFirst({
          where: { distrito: { equals: d.distrito, mode: 'insensitive' } },
        }))) ||
      (await this.prisma.comisaria.findFirst());

    const codigo = await this.nextCodigo();
    await this.prisma.denuncia.update({
      where: { id },
      data: {
        codigoSeguimiento: codigo,
        estadoId,
        enviadoEn: new Date(),
        actualizadoEn: new Date(),
        consentimientoId,
        comisariaId: comisaria?.id ?? null,
      },
    });

    const mesaPartes = await this.prisma.oficina.findFirst({
      where: { descripcion: { contains: 'Mesa de Partes', mode: 'insensitive' } },
    });
    if (mesaPartes) {
      await this.prisma.servidorDenuncia.create({
        data: {
          denuncia: id,
          servidorPublico: comisaria?.encargado ?? null,
          oficina: mesaPartes.id,
          comentario: 'Ingreso por mesa de partes',
        },
      });
    }

    await this.prisma.denunciante.update({ where: { id: usuarioId }, data: { haDenunciadoAntes: true } });
    await this.prisma.notificacion.create({
      data: { usuarioId, denunciaId: id, canal: 'email', plantilla: 'denuncia_recibida', estado: 'mocked' },
    });
    audit(usuarioId, 'denuncia.enviar', 'denuncia', id, { codigo });

    return {
      codigo_seguimiento: codigo,
      estado: await this.estadoDescripcion(estadoId),
      identidad: denunciante?.estadoIdentidad,
      comisaria: comisaria?.descripcion ?? null,
      oficina_actual: (await this.oficinaActual(id))?.oficina ?? null,
      siguiente_pasos: pendiente
        ? 'Tu denuncia fue registrada y quedó pendiente de verificación de identidad. La policía la validará.'
        : 'Tu denuncia fue registrada. Usa tu código para hacer seguimiento.',
    };
  }

  async listar(usuarioId: string) {
    const denuncias = await this.prisma.denuncia.findMany({
      where: { usuarioId },
      orderBy: { creadoEn: 'desc' },
    });
    const estados = await this.prisma.estado.findMany();
    const mapaEstado = new Map(estados.map((e) => [e.id, e.descripcion]));
    return Promise.all(
      denuncias.map(async (d) => ({
        id: d.id,
        codigoSeguimiento: d.codigoSeguimiento,
        tipo: d.tipo,
        estado: d.estadoId ? mapaEstado.get(d.estadoId) ?? null : null,
        distrito: d.distrito,
        oficinaActual: (await this.oficinaActual(d.id))?.oficina ?? null,
        enviadoEn: d.enviadoEn,
      })),
    );
  }

  async detalle(usuarioId: string, id: string) {
    const d = await this.propia(usuarioId, id);
    const comisaria = d.comisariaId ? await this.prisma.comisaria.findUnique({ where: { id: d.comisariaId } }) : null;
    return {
      ...d,
      estadoDescripcion: await this.estadoDescripcion(d.estadoId),
      comisaria: comisaria?.descripcion ?? null,
      oficinaActual: await this.oficinaActual(id),
      movimientos: await this.movimientos(id),
      objetos: await this.prisma.objetoRobado.findMany({ where: { denunciaId: id } }),
      sospechosos: await this.prisma.sospechoso.findMany({ where: { denuncia: id } }),
      testigos: await this.prisma.testigo.findMany({ where: { denuncia: id } }),
      evidencias: await this.prisma.evidencia.findMany({ where: { denunciaId: id } }),
    };
  }

  async constancia(usuarioId: string, id: string) {
    const d = await this.propia(usuarioId, id);
    if (!d.codigoSeguimiento) throw new BadRequestException('La denuncia aún no fue enviada');
    return {
      constancia: 'provisional',
      codigoSeguimiento: d.codigoSeguimiento,
      tipo: d.tipo,
      estado: await this.estadoDescripcion(d.estadoId),
      distrito: d.distrito,
      narrativa: d.narrativa,
      enviadoEn: d.enviadoEn,
      emitidoEn: Date.now(),
      nota: 'Constancia provisional generada por DenunciaPE (MVP). No reemplaza el documento oficial de la PNP.',
    };
  }

  // PUBLIC — code only, no login. Returns only the current office + status.
  async seguimientoPublico(codigo: string) {
    const d = await this.prisma.denuncia.findFirst({ where: { codigoSeguimiento: codigo } });
    if (!d) throw new NotFoundException('No se encontró una denuncia con ese código');
    const comisaria = d.comisariaId ? await this.prisma.comisaria.findUnique({ where: { id: d.comisariaId } }) : null;
    const movimientos = await this.movimientos(d.id);
    return {
      codigoSeguimiento: d.codigoSeguimiento,
      tipo: d.tipo,
      estado: await this.estadoDescripcion(d.estadoId),
      oficinaActual: (await this.oficinaActual(d.id))?.oficina ?? null,
      comisaria: comisaria?.descripcion ?? null,
      movimientos: movimientos.map((m) => ({ oficina: m.oficina, ingreso: m.ingreso })),
      enviadoEn: d.enviadoEn,
    };
  }
}
