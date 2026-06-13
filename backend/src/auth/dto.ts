import { IsEmail, IsOptional, IsString, Matches, MinLength } from 'class-validator';

export class RegisterDto {
  @Matches(/^\d{8}$/, { message: 'dni must be 8 digits' })
  dni: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @MinLength(8, { message: 'password must be at least 8 characters' })
  password: string;
}

export class LoginDto {
  @IsString()
  identifier: string; // dni or email

  @IsString()
  password: string;
}

export class OtpSendDto {
  @IsString()
  channel: 'email' | 'sms';
}

export class OtpVerifyDto {
  @IsString()
  code: string;
}
