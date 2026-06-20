import { IsString, IsNotEmpty, MinLength } from 'class-validator';

export class SubmitKycDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  fullName: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(9)
  nationalId: string;

  @IsString()
  @IsNotEmpty()
  phone: string;

  @IsString()
  @IsNotEmpty()
  bankName: string;
}