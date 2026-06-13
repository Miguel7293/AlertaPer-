import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { InMemoryStore } from '../store/in-memory.store';
import { User } from '../store/types';
import { RegisterDto } from './dto';

// NOTE: password hashing uses bcryptjs here for zero-native-build install reliability
// on Windows during the hackathon. docs/PLAN.md specifies Argon2id for production —
// swap `bcrypt` for `argon2` (argon2id) before going live; the interface is the same.

@Injectable()
export class AuthService {
  constructor(
    private readonly store: InMemoryStore,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  private publicUser(u: User) {
    return {
      id: u.id,
      role: u.role,
      dni: u.dni,
      email: u.email,
      phone: u.phone,
      emailVerified: u.emailVerified,
      phoneVerified: u.phoneVerified,
      hasFiledBefore: u.hasFiledBefore,
      tutorialCompletedAt: u.tutorialCompletedAt,
    };
  }

  async register(dto: RegisterDto) {
    const exists = this.store.users.find(
      (u) => u.dni === dto.dni || (dto.email && u.email === dto.email),
    );
    if (exists) {
      throw new ConflictException('An account with that DNI or email already exists');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const now = Date.now();
    const user: User = {
      id: this.store.id(),
      role: 'denunciante',
      email: dto.email ?? null,
      phone: dto.phone ?? null,
      dni: dto.dni,
      passwordHash,
      emailVerified: false,
      phoneVerified: false,
      failedLoginCount: 0,
      lockedUntil: null,
      hasFiledBefore: false,
      tutorialCompletedAt: null,
      createdAt: now,
    };
    this.store.users.push(user);

    // matching identity profile row (1:1)
    this.store.citizens.push({
      id: this.store.id(),
      userId: user.id,
      dni: user.dni,
      firstName: null,
      lastName: null,
      birthDate: null,
      dniIssueDate: null,
      identityStatus: 'partial',
    });

    this.store.audit(user.id, 'auth.register', 'user', user.id, { dni: user.dni });
    return this.issueTokens(user);
  }

  async login(identifier: string, password: string, ctx: { ua?: string; ip?: string }) {
    const user = this.store.users.find(
      (u) => u.dni === identifier || u.email === identifier,
    );
    if (!user) throw new UnauthorizedException('Invalid credentials');

    // Lockout check (custom brute-force protection)
    if (user.lockedUntil && user.lockedUntil > Date.now()) {
      const mins = Math.ceil((user.lockedUntil - Date.now()) / 60000);
      throw new UnauthorizedException(`Account locked. Try again in ${mins} min.`);
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      user.failedLoginCount += 1;
      const max = Number(this.config.get('MAX_FAILED_LOGINS') ?? 5);
      if (user.failedLoginCount >= max) {
        const lockMin = Number(this.config.get('LOCKOUT_MINUTES') ?? 15);
        user.lockedUntil = Date.now() + lockMin * 60000;
        user.failedLoginCount = 0;
        this.store.audit(user.id, 'auth.lockout', 'user', user.id, {});
      }
      this.store.audit(user.id, 'auth.login_failed', 'user', user.id, {
        attempts: user.failedLoginCount,
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    user.failedLoginCount = 0;
    user.lockedUntil = null;
    this.store.audit(user.id, 'auth.login', 'user', user.id, { ip: ctx.ip ?? null });
    return this.issueTokens(user, ctx);
  }

  async issueTokens(user: User, ctx: { ua?: string; ip?: string } = {}) {
    const accessTtl = Number(this.config.get('ACCESS_TOKEN_TTL') ?? 900);
    const accessToken = await this.jwt.signAsync(
      { sub: user.id, role: user.role },
      { secret: this.config.get('JWT_ACCESS_SECRET'), expiresIn: accessTtl },
    );

    // Opaque-ish refresh token; we store only its hash (revocable session).
    const refreshDays = Number(this.config.get('REFRESH_TOKEN_TTL_DAYS') ?? 7);
    const sessionId = this.store.id();
    const refreshToken = await this.jwt.signAsync(
      { sub: user.id, sid: sessionId },
      {
        secret: this.config.get('JWT_REFRESH_SECRET'),
        expiresIn: `${refreshDays}d`,
      },
    );
    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);
    this.store.sessions.push({
      id: sessionId,
      userId: user.id,
      refreshTokenHash,
      userAgent: ctx.ua ?? null,
      ip: ctx.ip ?? null,
      expiresAt: Date.now() + refreshDays * 86400000,
      revokedAt: null,
      createdAt: Date.now(),
    });

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      token_type: 'Bearer',
      expires_in: accessTtl,
      user: this.publicUser(user),
    };
  }

  async refresh(refreshToken: string | undefined) {
    if (!refreshToken) throw new UnauthorizedException('No refresh token');
    let payload: any;
    try {
      payload = await this.jwt.verifyAsync(refreshToken, {
        secret: this.config.get('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
    const session = this.store.sessions.find((s) => s.id === payload.sid);
    if (!session || session.revokedAt || session.expiresAt < Date.now()) {
      throw new UnauthorizedException('Session expired');
    }
    const match = await bcrypt.compare(refreshToken, session.refreshTokenHash);
    if (!match) throw new UnauthorizedException('Invalid refresh token');

    const user = this.store.users.find((u) => u.id === payload.sub);
    if (!user) throw new UnauthorizedException('User not found');

    // Rotate: revoke old session, issue a new one.
    session.revokedAt = Date.now();
    this.store.audit(user.id, 'auth.refresh', 'session', session.id, {});
    return this.issueTokens(user, { ua: session.userAgent ?? undefined, ip: session.ip ?? undefined });
  }

  async logout(refreshToken: string | undefined) {
    if (!refreshToken) return { ok: true };
    try {
      const payload: any = await this.jwt.verifyAsync(refreshToken, {
        secret: this.config.get('JWT_REFRESH_SECRET'),
      });
      const session = this.store.sessions.find((s) => s.id === payload.sid);
      if (session && !session.revokedAt) {
        session.revokedAt = Date.now();
        this.store.audit(payload.sub, 'auth.logout', 'session', session.id, {});
      }
    } catch {
      // ignore — logout is best-effort
    }
    return { ok: true };
  }

  me(userId: string) {
    const user = this.store.users.find((u) => u.id === userId);
    if (!user) throw new UnauthorizedException();
    return this.publicUser(user);
  }

  completeTutorial(userId: string) {
    const user = this.store.users.find((u) => u.id === userId);
    if (!user) throw new UnauthorizedException();
    user.tutorialCompletedAt = Date.now();
    return this.publicUser(user);
  }
}
