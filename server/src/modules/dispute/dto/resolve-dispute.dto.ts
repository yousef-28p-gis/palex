import { IsEnum, IsString, IsOptional } from 'class-validator';

export enum DisputeResolution {
  RELEASE_TO_BUYER = 'release_to_buyer',
  REFUND_TO_SELLER = 'refund_to_seller',
  CANCEL_TRADE = 'cancel_trade',
}

export class ResolveDisputeDto {
  @IsEnum(DisputeResolution)
  resolution: DisputeResolution;

  @IsOptional()
  @IsString()
  resolutionNotes?: string;
}