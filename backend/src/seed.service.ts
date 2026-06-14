import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from './prisma/prisma.service';
import { ESTADOS } from './store/estados';
import { ROL_DESCRIPCION, ROLES } from './store/roles';

// Idempotent demo seed (runs on startup). Seeds, by section:
//  - comisaría + oficinas
//  - 4 oficiales (uno por rol)            usuario / contraseña abajo
//  - 1 denunciante demo + denuncia ruteada
// Demo citizen:  DNI 12345678 / Demo1234
// Oficiales:  admin/Admin1234 · encargado/Encargado1234 · policia/Policia1234 · fiscal/Fiscal1234
@Injectable()
export class SeedService implements OnModuleInit {
  private readonly logger = new Logger('Seed');
  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    const comisaria = await this.seedComisariaYOficinas();
    await this.seedRoles();
    await this.seedOficiales(comisaria.id);
    await this.seedDenuncianteDemo(comisaria.id);
  }

  private async seedComisariaYOficinas() {
    let comisaria = await this.prisma.comisaria.findFirst({ where: { descripcion: 'Comisaría de Miraflores' } });
    if (!comisaria) {
      comisaria = await this.prisma.comisaria.create({
        data: { descripcion: 'Comisaría de Miraflores', departamento: 'Lima', provincia: 'Lima', distrito: 'Miraflores', direccion: 'Av. Larco 770' },
      });
    }
    for (const descripcion of ['Mesa de Partes', 'Sección de Investigación']) {
      const o = await this.prisma.oficina.findFirst({ where: { descripcion } });
      if (!o) await this.prisma.oficina.create({ data: { descripcion } });
    }
    return comisaria;
  }

  private async seedRoles() {
    for (const descripcion of Object.values(ROL_DESCRIPCION)) {
      const r = await this.prisma.rol.findFirst({ where: { descripcion } });
      if (!r) await this.prisma.rol.create({ data: { descripcion } });
    }
  }

  private async rolId(slug: keyof typeof ROL_DESCRIPCION | string) {
    const descripcion = (ROL_DESCRIPCION as Record<string, string>)[slug];
    const r = await this.prisma.rol.findFirst({ where: { descripcion } });
    return r?.id ?? null;
  }

  private async seedOficiales(comisariaId: string) {
    if (await this.prisma.servidorPublico.findFirst({ where: { usuario: 'admin' } })) return;

    const oficiales = [
      { usuario: 'admin', rol: ROLES.SUPER_ADMIN, comisaria: null, dni: '10000001', nombre: 'Ana', pass: 'Admin1234', correo: 'admin@mininter.gob.pe' },
      { usuario: 'encargado', rol: ROLES.ENCARGADO_COMISARIA, comisaria: comisariaId, dni: '10000002', nombre: 'Carlos', pass: 'Encargado1234', correo: 'encargado@pnp.gob.pe' },
      { usuario: 'policia', rol: ROLES.POLICIA, comisaria: comisariaId, dni: '10000003', nombre: 'Luis', pass: 'Policia1234', correo: 'policia@pnp.gob.pe' },
      { usuario: 'fiscal', rol: ROLES.FISCAL, comisaria: null, dni: '10000004', nombre: 'Rosa', pass: 'Fiscal1234', correo: 'fiscal@mpfn.gob.pe' },
    ];

    for (const o of oficiales) {
      await this.prisma.servidorPublico.create({
        data: {
          usuario: o.usuario,
          correoElectronico: o.correo,
          dni: o.dni,
          primerNombre: o.nombre,
          apellidoPaterno: 'Demo',
          apellidoMaterno: 'PNP',
          telefono: null,
          contrasenaHash: await bcrypt.hash(o.pass, 10),
          role: await this.rolId(o.rol),
          comisariaId: o.comisaria,
        },
      });
    }
    this.logger.log('Seed oficiales: admin/Admin1234 · encargado/Encargado1234 · policia/Policia1234 · fiscal/Fiscal1234');
  }

  private async seedDenuncianteDemo(comisariaId: string) {
    if (await this.prisma.denunciante.findUnique({ where: { dni: '12345678' } })) return;

    const mesaPartes = await this.prisma.oficina.findFirst({ where: { descripcion: 'Mesa de Partes' } });
    const investigacion = await this.prisma.oficina.findFirst({ where: { descripcion: 'Sección de Investigación' } });

    const demo = await this.prisma.denunciante.create({
      data: {
        correoElectronico: 'demo@denunciape.pe',
        dni: '12345678',
        primerNombre: 'Demo',
        apellidoPaterno: 'Usuario',
        apellidoMaterno: 'Prueba',
        fechaNacimiento: new Date('1990-05-12'),
        fechaEmisionDni: new Date('2015-03-01'),
        telefono: '999999999',
        correoVerificado: true,
        telefonoVerificado: true,
        haDenunciadoAntes: true,
        estadoIdentidad: 'verified',
        contrasenaHash: await bcrypt.hash('Demo1234', 10),
      },
    });
    await this.prisma.capturaFacial.createMany({
      data: [
        { usuarioId: demo.id, tipoCaptura: 'front', urlAlmacenamiento: 'seed://front.enc' },
        { usuarioId: demo.id, tipoCaptura: 'profile', urlAlmacenamiento: 'seed://profile.enc' },
      ],
    });

    const estadoInvestigacion = await this.prisma.estado.findFirst({ where: { descripcion: ESTADOS.EN_INVESTIGACION } });
    const now = Date.now();
    const denuncia = await this.prisma.denuncia.create({
      data: {
        codigoSeguimiento: 'DEN-2026-0001001',
        usuarioId: demo.id,
        tipo: 'robo',
        estadoId: estadoInvestigacion?.id ?? null,
        hora: new Date('2026-06-12T20:30:00'),
        departamento: 'Lima',
        provincia: 'Lima',
        distrito: 'Miraflores',
        referenciaUbicacion: 'Av. Larco con Av. Benavides',
        narrativa: 'Me sustrajeron el celular con violencia mientras caminaba.',
        comisariaId,
        enviadoEn: new Date(now - 86400000),
      },
    });
    await this.prisma.objetoRobado.create({
      data: { denunciaId: denuncia.id, nombre: 'Celular', marcaModelo: 'Samsung A54', valorAproximado: 1200, descripcion: 'Negro, con funda azul' },
    });
    if (mesaPartes && investigacion) {
      await this.prisma.servidorDenuncia.createMany({
        data: [
          { denuncia: denuncia.id, oficina: mesaPartes.id, fechaIngreso: new Date(now - 86400000), fechaSalida: new Date(now - 43200000), comentario: 'Ingreso por mesa de partes' },
          { denuncia: denuncia.id, oficina: investigacion.id, fechaIngreso: new Date(now - 43200000), comentario: 'Derivado a investigación' },
        ],
      });
    }
    this.logger.log('Seed listo: demo DNI 12345678 / Demo1234 + denuncia DEN-2026-0001001.');
  }
}
