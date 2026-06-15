import { Module } from '@nestjs/common';
import { DenunciasService } from './denuncias.service';
import { DenunciasController } from './denuncias.controller';
import { SeguimientoController } from './seguimiento.controller';
import { StorageService } from '../storage/storage.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [DenunciasController, SeguimientoController],
  providers: [DenunciasService, StorageService],
})
export class DenunciasModule {}
