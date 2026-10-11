import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Roles, CurrentUser } from './auth.decorators';
import type { JwtUser } from './auth.decorators';
import { IsEmail, IsEnum, IsOptional, IsString, MinLength, IsBoolean } from 'class-validator';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

class CreateUserDto {
  @IsString()
  name!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(6)
  password!: string;

  @IsEnum(Role)
  role!: Role;
}

class UpdateUserDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;

  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

const SAFE = { id: true, name: true, email: true, role: true, active: true, createdAt: true };

@Roles('ADMIN')
@Controller('users')
export class UsersController {
  constructor(private prisma: PrismaService) {}

  @Get()
  list(@CurrentUser() user: JwtUser) {
    return this.prisma.user.findMany({ where: { businessId: user.businessId }, select: SAFE, orderBy: { createdAt: 'asc' } });
  }

  @Post()
  async create(@CurrentUser() user: JwtUser, @Body() dto: CreateUserDto) {
    const exists = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (exists) throw new BadRequestException('Ese email ya está registrado');
    return this.prisma.user.create({
      data: {
        businessId: user.businessId,
        name: dto.name,
        email: dto.email,
        role: dto.role,
        passwordHash: await bcrypt.hash(dto.password, 10),
      },
      select: SAFE,
    });
  }

  @Patch(':id')
  async update(@CurrentUser() user: JwtUser, @Param('id') id: string, @Body() dto: UpdateUserDto) {
    const target = await this.prisma.user.findFirst({ where: { id, businessId: user.businessId } });
    if (!target) throw new BadRequestException('Usuario no encontrado en tu negocio');
    const data: Record<string, unknown> = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.role !== undefined) data.role = dto.role;
    if (dto.active !== undefined) data.active = dto.active;
    if (dto.password) data.passwordHash = await bcrypt.hash(dto.password, 10);
    return this.prisma.user.update({ where: { id }, data, select: SAFE });
  }

  @Delete(':id')
  async remove(@CurrentUser() user: JwtUser, @Param('id') id: string) {
    const target = await this.prisma.user.findFirst({ where: { id, businessId: user.businessId } });
    if (!target) throw new BadRequestException('Usuario no encontrado en tu negocio');
    return this.prisma.user.update({
      where: { id },
      data: { active: false },
      select: SAFE,
    });
  }
}
