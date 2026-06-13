import { IsIn, IsOptional, IsString } from 'class-validator';

export class ConsentimientoDto {
  @IsIn(['face_biometric', 'data_processing', 'truthfulness'])
  tipo: 'face_biometric' | 'data_processing' | 'truthfulness';

  @IsString() versionTexto: string;
}

export class CapturaFacialDto {
  @IsIn(['front', 'profile'])
  tipoCaptura: 'front' | 'profile';

  @IsString() imagenBase64: string;

  @IsOptional() @IsString() consentimientoId?: string;
}
