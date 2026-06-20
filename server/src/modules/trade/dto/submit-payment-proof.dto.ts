import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class SubmitPaymentProofDto {
  @IsString()
  @IsNotEmpty()
  transactionRef: string;

  @IsString()
  @IsNotEmpty()
  bankName: string;

  @IsString()
  @IsNotEmpty()
  last4Digits: string;

  @IsOptional()
  imageUrl?: string;
}