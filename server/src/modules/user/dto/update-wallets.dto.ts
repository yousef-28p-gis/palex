import { IsOptional, IsString, Matches } from 'class-validator';

export class UpdateWalletsDto {
  @IsOptional()
  @IsString()
  @Matches(/^T[A-Za-z0-9]{33}$/, { message: 'عنوان TRC20 غير صالح' })
  trc20Wallet?: string;

  @IsOptional()
  @IsString()
  @Matches(/^0x[a-fA-F0-9]{40}$/, { message: 'عنوان BEP20 غير صالح' })
  bscWallet?: string;
}