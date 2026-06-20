import { IsNumber, IsEnum, Min, IsString, IsNotEmpty, MinLength, Max } from 'class-validator';

export enum FiatCurrency {
  ILS = 'ils',
  USD = 'usd',
}

export enum Network {
  TRC20 = 'trc20',
  BEP20 = 'bep20',
}

export class CreateOfferDto {
  @IsEnum(FiatCurrency)
  fiatCurrency: FiatCurrency;

  @IsNumber()
  @Min(-5)
  @Max(5)
  premiumPercent: number;

  @IsNumber()
  @Min(10)
  minAmount: number;

  @IsNumber()
  @Min(10)
  maxAmount: number;

  @IsEnum(Network)
  network: Network;

  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  paymentInstructions: string;

  @IsString()
  @IsNotEmpty()
  bankName: string;
}