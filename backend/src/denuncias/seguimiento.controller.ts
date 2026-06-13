import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import { DenunciasService } from './denuncias.service';

// PUBLIC tracking — no login. Code only. Returns the current office + status only.
// Privacy: reveals minimal data (office + estado), no personal information.
@Controller('seguimiento')
export class SeguimientoController {
  constructor(private readonly denuncias: DenunciasService) {}

  @Get()
  consultar(@Query('codigo') codigo: string) {
    if (!codigo) throw new BadRequestException('El código es obligatorio');
    return this.denuncias.seguimientoPublico(codigo);
  }
}
