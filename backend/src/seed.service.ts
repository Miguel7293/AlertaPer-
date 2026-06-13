import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from './prisma/prisma.service';
import { ESTADOS } from './store/estados';

// Idempotent demo seed (runs on startup). Lookups (estado/roles/comisaria/oficinas)
// come from db/schema.sql; this only adds a demo citizen with completed onboarding
// and a routed report so the public code-only lookup works out of the box.
//   Demo citizen:  DNI 12345678 / Demo1234
@Injectable()
export class SeedService implements OnModuleInit {
  private readonly logger = new Logger('Seed');
  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    const exists = await this.prisma.denunciante.findUnique({ where: { dni: '12345678' } });
    if (exists) return;

    // ensure a comisaria + oficinas exist (normally seeded by db/schema.sql)
    let comisaria = await this.prisma.comisaria.findFirst({ where: { descripcion: 'Comisaría de Miraflores' } });
    if (!comisaria) {
      comisaria = await this.prisma.comisaria.create({
        data: { descripcion: 'Comisaría de Miraflores', departamento: 'Lima', provincia: 'Lima', distrito: 'Miraflores', direccion: 'Av. Larco 770' },
      });
    }
    let mesaPartes = await this.prisma.oficina.findFirst({ where: { descripcion: 'Mesa de Partes' } });
    if (!mesaPartes) mesaPartes = await this.prisma.oficina.create({ data: { descripcion: 'Mesa de Partes' } });
    let investigacion = await this.prisma.oficina.findFirst({ where: { descripcion: 'Sección de Investigación' } });
    if (!investigacion) investigacion = await this.prisma.oficina.create({ data: { descripcion: 'Sección de Investigación' } });

    const demo = await this.prisma.denunciante.create({
      data: {
        correoElectronico: 'demo@denunciape.pe',
        dni: '12345678',
        primerNombre: 'Demo',
        apellidoPaterno: 'Usuario',
        apellidoMaterno: 'Prueba',
        fechaNacimiento: new Date('1990-05-12'),
        fechaEmisionDni: new Date('2015-03-01'),
        telefono: '+51999999999',
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
        comisariaId: comisaria.id,
        enviadoEn: new Date(now - 86400000),
      },
    });
    await this.prisma.objetoRobado.create({
      data: { denunciaId: denuncia.id, nombre: 'Celular', marcaModelo: 'Samsung A54', valorAproximado: 1200, descripcion: 'Negro, con funda azul' },
    });
    await this.prisma.servidorDenuncia.createMany({
      data: [
        { denuncia: denuncia.id, oficina: mesaPartes.id, fechaIngreso: new Date(now - 86400000), fechaSalida: new Date(now - 43200000), comentario: 'Ingreso por mesa de partes' },
        { denuncia: denuncia.id, oficina: investigacion.id, fechaIngreso: new Date(now - 43200000), comentario: 'Derivado a investigación' },
      ],
    });

    this.logger.log('Seed listo: demo DNI 12345678 / Demo1234 + denuncia DEN-2026-0001001.');
  }
}
