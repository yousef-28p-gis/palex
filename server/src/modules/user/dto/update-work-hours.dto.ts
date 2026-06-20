import { IsString, IsOptional, IsArray, IsBoolean, Matches } from 'class-validator';

export class UpdateWorkHoursDto {
  @IsOptional()
  @IsString()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, { message: 'صيغة وقت البدء غير صالحة (HH:MM)' })
  workHoursStart?: string;

  @IsOptional()
  @IsString()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, { message: 'صيغة وقت الانتهاء غير صالحة (HH:MM)' })
  workHoursEnd?: string;

  @IsOptional()
  @IsArray()
  workDays?: number[]; // 0=الأحد, 1=الإثنين, ..., 6=السبت

  @IsOptional()
  @IsBoolean()
  isActiveNow?: boolean;
}