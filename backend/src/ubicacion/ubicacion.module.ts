import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { UbicacionController } from './ubicacion.controller';
import { UbicacionService } from './ubicacion.service';

@Module({
  imports: [AuthModule],
  controllers: [UbicacionController],
  providers: [UbicacionService],
})
export class UbicacionModule {}
