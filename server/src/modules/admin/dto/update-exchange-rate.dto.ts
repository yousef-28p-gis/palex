import { IsNumber, Min } from 'class-validator';

export class UpdateExchangeRateDto {
  @IsNumber()
  @Min(0.01)
  usdToIls: number;
}