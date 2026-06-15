import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { VerificacionModule } from './verificacion/verificacion.module';
import { DenunciasModule } from './denuncias/denuncias.module';
import { SeedService } from './seed.service';
import { UbicacionModule } from './ubicacion/ubicacion.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    VerificacionModule,
    DenunciasModule,
    UbicacionModule,
  ],
  providers: [SeedService],
})
export class AppModule {}
