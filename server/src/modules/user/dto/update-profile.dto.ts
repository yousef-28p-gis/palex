import { IsOptional, IsString, MinLength, IsIn } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  fullName?: string;

  @IsOptional()
  @IsString()
  @MinLength(10)
  phone?: string;

  @IsOptional()
  @IsString()
  @IsIn(['رام الله', 'الخليل', 'نابلس', 'غزة', 'بيت لحم', 'قلقيلية', 'جنين', 'طولكرم', 'سلفيت', 'أريحا'])
  governorate?: string;
}