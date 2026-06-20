import { IsArray, IsOptional } from 'class-validator';

export class AddEvidenceDto {
  @IsOptional()
  @IsArray()
  evidenceUrls?: string[];
}