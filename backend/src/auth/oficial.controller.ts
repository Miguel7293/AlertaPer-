import { Body, Controller, Get, Param, Post, Query, Req, Res, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { CrearComisariaDto, CrearOficialDto, LoginOficialDto } from './dto';
import { JwtAuthGuard, AuthUser } from '../common/jwt-auth.guard';
import { RolesGuard } from '../common/roles.guard';
import { Roles } from '../common/roles.decorator';
import { CurrentUser } from '../common/current-user.decorator';
import { ROLES } from '../store/roles';

// Acceso de servidores públicos (PNP / fiscalía) — SEPARADO del acceso ciudadano.
const REFRESH_COOKIE = 'seguro_rt';

@Controller('auth/oficial')
export class OficialController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService,
  ) {}

  private setRefreshCookie(res: Response, token: string) {
    const days = Number(this.config.get('REFRESH_TOKEN_TTL_DAYS') ?? 7);
    const isProd = process.env.NODE_ENV === 'production';
    res.cookie(REFRESH_COOKIE, token, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
      maxAge: days * 86400000,
      path: '/auth',
    });
  }

  @Post('login')
  async login(@Body() dto: LoginOficialDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const result = await this.auth.loginOficial(dto.usuario, dto.contrasena, {
      ua: req.headers['user-agent'],
      ip: req.ip,
    });
    this.setRefreshCookie(res, result.refresh_token);
    const { refresh_token, ...rest } = result;
    return rest;
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@CurrentUser() user: AuthUser) {
    return this.auth.meOficial(user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('resumen')
  resumen(@CurrentUser() user: AuthUser) {
    return this.auth.resumenOficial(user);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(ROLES.SUPER_ADMIN, ROLES.ENCARGADO_COMISARIA, ROLES.POLICIA, ROLES.FISCAL)
  @Get('denuncias')
  denuncias(@CurrentUser() user: AuthUser, @Query('vista') vista?: string) {
    return this.auth.listarDenunciasOficial(user, vista === 'mias' ? 'mias' : 'bandeja');
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(ROLES.SUPER_ADMIN, ROLES.ENCARGADO_COMISARIA, ROLES.POLICIA, ROLES.FISCAL)
  @Get('denuncias/:id')
  detalleDenuncia(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.auth.detalleDenunciaOficial(user, id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(ROLES.POLICIA)
  @Post('denuncias/:id/aceptar')
  aceptarDenuncia(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.auth.aceptarDenuncia(user, id);
  }

  // --- Gestión de cuentas (solo Super Admin y Encargado de Comisaría) ---

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(ROLES.SUPER_ADMIN, ROLES.ENCARGADO_COMISARIA)
  @Post('usuarios')
  crear(@CurrentUser() user: AuthUser, @Body() dto: CrearOficialDto) {
    return this.auth.crearOficial(user, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(ROLES.SUPER_ADMIN, ROLES.ENCARGADO_COMISARIA)
  @Get('usuarios')
  listar(@CurrentUser() user: AuthUser) {
    return this.auth.listarOficiales(user);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(ROLES.SUPER_ADMIN, ROLES.ENCARGADO_COMISARIA)
  @Get('comisarias')
  comisarias() {
    return this.auth.listarComisarias();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(ROLES.SUPER_ADMIN)
  @Get('comisarias/:id')
  detalleComisaria(@Param('id') id: string) {
    return this.auth.detalleComisaria(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(ROLES.SUPER_ADMIN)
  @Post('comisarias')
  crearComisaria(@CurrentUser() user: AuthUser, @Body() dto: CrearComisariaDto) {
    return this.auth.crearComisaria(user, dto);
  }
}
