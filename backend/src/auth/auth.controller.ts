import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto, RegisterDto } from './dto';
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
    res.cookie(REFRESH_COOKIE, token, {
      httpOnly: true,
      secure: false, // dev only; true behind HTTPS in production
      sameSite: 'lax',
      maxAge: days * 86400000,
      path: '/auth',
    });
  }

  private ctx(req: Request) {
    return { ua: req.headers['user-agent'], ip: req.ip };
  }

  @Post('register')
  async register(@Body() dto: RegisterDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.auth.register(dto);
    this.setRefreshCookie(res, result.refresh_token);
    return this.stripRefresh(result);
  }

  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.auth.login(dto.identifier, dto.password, this.ctx(req));
    this.setRefreshCookie(res, result.refresh_token);
    return this.stripRefresh(result);
  }

  @Post('refresh')
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const token = req.cookies?.[REFRESH_COOKIE];
    const result = await this.auth.refresh(token);
    this.setRefreshCookie(res, result.refresh_token);
    return this.stripRefresh(result);
  }

  @Post('logout')
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const token = req.cookies?.[REFRESH_COOKIE];
    await this.auth.logout(token);
    res.clearCookie(REFRESH_COOKIE, { path: '/auth' });
    return { ok: true };
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@CurrentUser() user: AuthUser) {
    return this.auth.me(user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('me/tutorial-complete')
  completeTutorial(@CurrentUser() user: AuthUser) {
    return this.auth.completeTutorial(user.id);
  }

  // Refresh token travels only in the httpOnly cookie — never echo it in the body.
  private stripRefresh(result: any) {
    const { refresh_token, ...rest } = result;
    return rest;
  }
}
