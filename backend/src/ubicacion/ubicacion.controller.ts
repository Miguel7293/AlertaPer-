import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { UbicacionService } from './ubicacion.service';

@Controller('ubicacion')
@UseGuards(JwtAuthGuard)
export class UbicacionController {
  constructor(private readonly ubicacion: UbicacionService) {}

  @Get('geocodificar')
  geocodificar(
    @Query('departamento') departamento = '',
    @Query('provincia') provincia = '',
    @Query('distrito') distrito = '',
  ) {
    return this.ubicacion.geocodificar(departamento, provincia, distrito);
  }

  @Get('direccion')
  direccion(
    @Query('latitud') latitud = '',
    @Query('longitud') longitud = '',
  ) {
    return this.ubicacion.direccion(
      latitud.trim() ? Number(latitud) : Number.NaN,
      longitud.trim() ? Number(longitud) : Number.NaN,
    );
  }
}
