import { IsEmail, IsString, MinLength, MaxLength, Matches } from 'class-validator';

export class RegisterDto {
  @IsEmail({}, { message: 'البريد الإلكتروني غير صالح' })
  email: string;

  @IsString()
  @MinLength(6, { message: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'كلمة المرور يجب أن تحتوي على حرف كبير وحرف صغير ورقم',
  })
  password: string;

  @IsString()
  @MinLength(3, { message: 'الاسم الكامل يجب أن يكون 3 أحرف على الأقل' })
  @MaxLength(50, { message: 'الاسم الكامل لا يتجاوز 50 حرفاً' })
  fullName: string;

  @IsString()
  @Matches(/^05[0-9]{8}$/, { message: 'رقم الجوال غير صالح لفلسطين' })
  phone: string;
}