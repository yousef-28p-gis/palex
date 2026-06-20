import { IsUUID, IsString, IsNotEmpty, IsOptional, IsArray } from 'class-validator';

export class OpenDisputeDto {
  @IsUUID()
  tradeId: string;

  @IsString()
  @IsNotEmpty()
  reason: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsOptional()
  @IsArray()
  evidenceUrls?: string[];
}