import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { IS_PUBLIC_KEY, ROLES_KEY, JwtUser } from './auth.decorators';
import type { Role } from '@prisma/client';
import type { Request } from 'express';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private jwt: JwtService,
    private reflector: Reflector,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (isPublic) return true;

    const req = ctx.switchToHttp().getRequest<Request & { user?: JwtUser }>();
    const header = req.headers.authorization ?? '';
    // Query param como alternativa para links directos (export, PNG de códigos)
    const token = header.startsWith('Bearer ')
      ? header.slice(7)
      : (req.query['token'] as string | undefined);
    if (!token) throw new UnauthorizedException('Token requerido');
    try {
      req.user = await this.jwt.verifyAsync<JwtUser>(token);
      return true;
    } catch {
      throw new UnauthorizedException('Token inválido o expirado');
    }
  }
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (!roles?.length) return true;
    const { user } = ctx.switchToHttp().getRequest<{ user?: JwtUser }>();
    if (!user) return false;
    if (user.role === 'SUPERADMIN') return true;
    if (!roles.includes(user.role))
      throw new ForbiddenException('Requiere perfil ' + roles.join(' o '));
    return true;
  }
}
