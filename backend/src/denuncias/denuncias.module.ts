import { Module } from '@nestjs/common';
import { DenunciasService } from './denuncias.service';
import { DenunciasController } from './denuncias.controller';
import { SeguimientoController } from './seguimiento.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [DenunciasController, SeguimientoController],
  providers: [DenunciasService],
})
export class DenunciasModule {}
