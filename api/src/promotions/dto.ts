import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PromoType } from '@prisma/client';

export class CreatePromotionDto {
  @IsString()
  name!: string;

  @IsEnum(PromoType)
  type!: PromoType;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  @Max(100)
  percent?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2)
  packQty?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  packPrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2)
  nTake?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  mPay?: number;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  productIds?: string[];

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsISO8601()
  startsAt?: string;

  @IsOptional()
  @IsISO8601()
  endsAt?: string;
}

export class UpdatePromotionDto extends CreatePromotionDto {
  @IsOptional()
  @IsString()
  declare name: string;

  @IsOptional()
  @IsEnum(PromoType)
  declare type: PromoType;
}

export class QuoteItemDto {
  @IsString()
  productId!: string;

  @Type(() => Number)
  @IsInt()
  @IsPositive()
  quantity!: number;
}

export class QuoteDto {
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => QuoteItemDto)
  items!: QuoteItemDto[];
}
