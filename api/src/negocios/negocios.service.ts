import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class NegociosService {
  constructor(private prisma: PrismaService) {}

  async list() {
    const negocios = await this.prisma.business.findMany({
      include: {
        users: {
          select: { id: true, name: true, email: true, role: true, active: true },
          orderBy: { createdAt: 'asc' },
        },
        _count: { select: { products: true, sales: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
    return negocios.map((n) => ({
      id: n.id,
      name: n.name,
      rut: n.rut,
      address: n.address,
      phone: n.phone,
      active: n.active,
      createdAt: n.createdAt,
      usuarios: n.users,
      contadores: { productos: n._count.products, ventas: n._count.sales },
    }));
  }

  /** Crea el negocio junto a su primer usuario administrador. */
  async create(data: {
    name: string;
    rut?: string;
    address?: string;
    phone?: string;
    adminName: string;
    adminEmail: string;
    adminPassword: string;
  }) {
    if (!data.name?.trim()) throw new BadRequestException('Nombre del negocio requerido');
    if (!data.adminName?.trim() || !data.adminEmail?.trim() || (data.adminPassword?.length ?? 0) < 6)
      throw new BadRequestException('Administrador inicial: nombre, email y contraseña (mín. 6) son requeridos');
    const emailUsado = await this.prisma.user.findUnique({ where: { email: data.adminEmail.trim() } });
    if (emailUsado) throw new BadRequestException('Ese email ya está registrado en el sistema');

    return this.prisma.business.create({
      data: {
        name: data.name.trim(),
        rut: data.rut?.trim() || null,
        address: data.address?.trim() || null,
        phone: data.phone?.trim() || null,
        users: {
          create: {
            name: data.adminName.trim(),
            email: data.adminEmail.trim(),
            role: 'ADMIN',
            passwordHash: await bcrypt.hash(data.adminPassword, 10),
          },
        },
      },
      include: { users: { select: { id: true, name: true, email: true, role: true, active: true } } },
    });
  }

  async update(id: string, data: { name?: string; rut?: string; address?: string; phone?: string; active?: boolean }) {
    const n = await this.prisma.business.findUnique({ where: { id } });
    if (!n) throw new NotFoundException('Negocio no encontrado');
    return this.prisma.business.update({
      where: { id },
      data: {
        name: data.name?.trim() || undefined,
        rut: data.rut !== undefined ? data.rut?.trim() || null : undefined,
        address: data.address !== undefined ? data.address?.trim() || null : undefined,
        phone: data.phone !== undefined ? data.phone?.trim() || null : undefined,
        active: data.active,
      },
    });
  }

  async crearUsuario(negocioId: string, data: { name: string; email: string; password: string; role: 'ADMIN' | 'VENDEDOR' }) {
    const n = await this.prisma.business.findUnique({ where: { id: negocioId } });
    if (!n) throw new NotFoundException('Negocio no encontrado');
    if (!data.name?.trim() || !data.email?.trim() || (data.password?.length ?? 0) < 6)
      throw new BadRequestException('Nombre, email y contraseña (mín. 6) son requeridos');
    if (!['ADMIN', 'VENDEDOR'].includes(data.role)) throw new BadRequestException('Rol inválido');
    const emailUsado = await this.prisma.user.findUnique({ where: { email: data.email.trim() } });
    if (emailUsado) throw new BadRequestException('Ese email ya está registrado en el sistema');

    return this.prisma.user.create({
      data: {
        businessId: negocioId,
        name: data.name.trim(),
        email: data.email.trim(),
        role: data.role,
        passwordHash: await bcrypt.hash(data.password, 10),
      },
      select: { id: true, name: true, email: true, role: true, active: true },
    });
  }
}
