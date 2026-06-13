import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { VerificacionModule } from './verificacion/verificacion.module';
import { DenunciasModule } from './denuncias/denuncias.module';
import { SeedService } from './seed.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    VerificacionModule,
    DenunciasModule,
  ],
  providers: [SeedService],
})
export class AppModule {}
