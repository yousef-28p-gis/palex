import { IsUUID, IsNumber, Min } from 'class-validator';

export class StartTradeDto {
  @IsUUID()
  offerId: string;

  @IsNumber()
  @Min(10)
  amountUsdt: number;
}