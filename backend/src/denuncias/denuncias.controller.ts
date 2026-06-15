import { Body, Controller, Get, Param, Patch, Post, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { DenunciasService } from './denuncias.service';
import { JwtAuthGuard, AuthUser } from '../common/jwt-auth.guard';
import { CurrentUser } from '../common/current-user.decorator';
import {
  ActualizarDenunciaDto,
  EnviarDto,
  EvidenciaDto,
  ObjetoDto,
  SospechosoDto,
  TestigoDto,
} from './dto';

@UseGuards(JwtAuthGuard)
@Controller('denuncias')
export class DenunciasController {
  constructor(private readonly denuncias: DenunciasService) {}

  @Post()
  crear(@CurrentUser() user: AuthUser) {
    return this.denuncias.crear(user.id);
  }

  @Get()
  listar(@CurrentUser() user: AuthUser) {
    return this.denuncias.listar(user.id);
  }

  @Get(':id')
  detalle(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.denuncias.detalle(user.id, id);
  }

  @Patch(':id')
  actualizar(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: ActualizarDenunciaDto) {
    return this.denuncias.actualizar(user.id, id, dto);
  }

  @Post(':id/objetos')
  objeto(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: ObjetoDto) {
    return this.denuncias.agregarObjeto(user.id, id, dto);
  }

  @Post(':id/sospechosos')
  sospechoso(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: SospechosoDto) {
    return this.denuncias.agregarSospechoso(user.id, id, dto);
  }

  @Post(':id/testigos')
  testigo(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: TestigoDto) {
    return this.denuncias.agregarTestigo(user.id, id, dto);
  }

  @Post(':id/evidencias')
  evidencia(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: EvidenciaDto) {
    return this.denuncias.agregarEvidencia(user.id, id, dto);
  }

  @Post(':id/enviar')
  enviar(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: EnviarDto) {
    return this.denuncias.enviar(user.id, id, dto);
  }

  @Get(':id/constancia')
  async constancia(@CurrentUser() user: AuthUser, @Param('id') id: string, @Res() res: Response) {
    const pdf = await this.denuncias.constanciaPdf(user.id, id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${pdf.fileName}"`);
    res.send(pdf.buffer);
  }
}
