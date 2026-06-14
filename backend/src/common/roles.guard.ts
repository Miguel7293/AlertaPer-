import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from './roles.decorator';

// Corre DESPUÉS de JwtAuthGuard (que pone req.user). Verifica que el usuario sea
// servidor_publico y tenga uno de los roles permitidos por @Roles(...).
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (!roles || roles.length === 0) return true;
    const user = ctx.switchToHttp().getRequest().user;
    if (!user || user.tipo !== 'servidor_publico' || !roles.includes(user.role)) {
      throw new ForbiddenException('No autorizado para esta acción');
    }
    return true;
  }
}
