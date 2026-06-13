import { Body, Controller, Get, Post, Req, Res, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { EmailVerifyDto, LoginDto, RegisterDto } from './dto';
import { JwtAuthGuard, AuthUser } from '../common/jwt-auth.guard';
import { CurrentUser } from '../common/current-user.decorator';

const REFRESH_COOKIE = 'seguro_rt';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService,
  ) {}

  private setRefreshCookie(res: Response, token: string) {
    const days = Number(this.config.get('REFRESH_TOKEN_TTL_DAYS') ?? 7);
    const isProd = process.env.NODE_ENV === 'production';
    res.cookie(REFRESH_COOKIE, token, {
      httpOnly: true,
      // cross-site (Vercel <-> Render) requires SameSite=None + Secure over HTTPS
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
      maxAge: days * 86400000,
      path: '/auth',
    });
  }

  private ctx(req: Request) {
    return { ua: req.headers['user-agent'], ip: req.ip };
  }

  private strip(result: any) {
    const { refresh_token, ...rest } = result;
    return rest;
  }

  @Post('register')
  async register(@Body() dto: RegisterDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.auth.register(dto);
    this.setRefreshCookie(res, result.refresh_token);
    return this.strip(result);
  }

  @Post('login')
  async login(@Body() dto: LoginDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const result = await this.auth.login(dto.identificador, dto.contrasena, this.ctx(req));
    this.setRefreshCookie(res, result.refresh_token);
    return this.strip(result);
  }

  @Post('refresh')
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const result = await this.auth.refresh(req.cookies?.[REFRESH_COOKIE]);
    this.setRefreshCookie(res, result.refresh_token);
    return this.strip(result);
  }

  @Post('logout')
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    await this.auth.logout(req.cookies?.[REFRESH_COOKIE]);
    const isProd = process.env.NODE_ENV === 'production';
    res.clearCookie(REFRESH_COOKIE, {
      path: '/auth',
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
    });
    return { ok: true };
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@CurrentUser() user: AuthUser) {
    return this.auth.me(user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('email/send')
  emailSend(@CurrentUser() user: AuthUser) {
    return this.auth.emailSend(user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('email/verify')
  emailVerify(@CurrentUser() user: AuthUser, @Body() dto: EmailVerifyDto) {
    return this.auth.emailVerify(user.id, dto.codigo);
  }
}
