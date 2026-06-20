import { IsOptional, IsEnum, IsNumber, Min, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { FiatCurrency, Network } from './create-offer.dto';

export class QueryOffersDto {
  @IsOptional()
  @IsEnum(FiatCurrency)
  fiatCurrency?: FiatCurrency;

  @IsOptional()
  @IsEnum(Network)
  network?: Network;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minPrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxPrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number = 20;
}