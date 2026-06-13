import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { VerificacionService } from './verificacion.service';
import { JwtAuthGuard, AuthUser } from '../common/jwt-auth.guard';
import { CurrentUser } from '../common/current-user.decorator';
import { CapturaFacialDto, ConsentimientoDto } from './dto';

@UseGuards(JwtAuthGuard)
@Controller('verificacion')
export class VerificacionController {
  constructor(private readonly verif: VerificacionService) {}

  @Post('consentimiento')
  consentimiento(@CurrentUser() user: AuthUser, @Body() dto: ConsentimientoDto) {
    return this.verif.consentimiento(user.id, dto);
  }

  @Post('captura-facial')
  capturaFacial(@CurrentUser() user: AuthUser, @Body() dto: CapturaFacialDto) {
    return this.verif.capturaFacial(user.id, dto);
  }

  @Post('reniec')
  reniec(@CurrentUser() user: AuthUser) {
    return this.verif.reniec(user.id);
  }

  @Get('estado')
  estado(@CurrentUser() user: AuthUser) {
    return this.verif.estado(user.id);
  }
}
