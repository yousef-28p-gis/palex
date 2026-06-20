import { IsString, IsNumber, Min, Max, IsNotEmpty } from 'class-validator';

export class SuspendUserDto {
  @IsString()
  @IsNotEmpty()
  reason: string;

  @IsNumber()
  @Min(1)
  @Max(30)
  days: number = 7;
}