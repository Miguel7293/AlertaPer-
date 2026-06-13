import { IsIn, IsOptional, IsString, Matches } from 'class-validator';

export class BasicValidationDto {
  @Matches(/^\d{8}$/, { message: 'dni must be 8 digits' })
  dni: string;

  @IsString()
  birthDate: string; // ISO yyyy-mm-dd

  @IsOptional()
  @IsString()
  dniIssueDate?: string;

  @IsOptional()
  @IsString()
  checkDigit?: string;
}

export class ConsentDto {
  @IsIn(['face_biometric', 'data_processing', 'truthfulness'])
  type: 'face_biometric' | 'data_processing' | 'truthfulness';

  @IsString()
  textVersion: string;
}

export class FaceCaptureDto {
  @IsIn(['front', 'profile'])
  captureType: 'front' | 'profile';

  @IsString()
  imageBase64: string; // data URL or raw base64

  @IsOptional()
  @IsString()
  reportId?: string;

  @IsOptional()
  @IsString()
  consentId?: string;
}

export class OtpSendDto {
  @IsIn(['email', 'sms'])
  channel: 'email' | 'sms';
}

export class OtpVerifyDto {
  @IsString()
  code: string;
}
