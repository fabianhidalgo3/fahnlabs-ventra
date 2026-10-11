import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {}

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email }, include: { business: true } });
    if (!user || !user.active)
      throw new UnauthorizedException('Credenciales inválidas');
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Credenciales inválidas');

    if (!user.business.active)
      throw new UnauthorizedException('El negocio está desactivado');
    const payload = {
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      businessId: user.businessId,
      businessName: user.business.name,
    };
    return {
      token: await this.jwt.signAsync(payload),
      user: payload,
    };
  }
}
