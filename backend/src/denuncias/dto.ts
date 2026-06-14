import {
  IsArray,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class ActualizarDenunciaDto {
  @IsOptional() @IsIn(['robo', 'hurto']) tipo?: 'robo' | 'hurto';
  @IsOptional() @IsString() @MaxLength(40) hora?: string;
  @IsOptional() @IsString() @MaxLength(80) departamento?: string;
  @IsOptional() @IsString() @MaxLength(80) provincia?: string;
  @IsOptional() @IsString() @MaxLength(80) distrito?: string;
  @IsOptional() @IsString() @MaxLength(200) referenciaUbicacion?: string;
  @IsOptional() @IsNumber() @Min(-90) @Max(90) geoLatitud?: number;
  @IsOptional() @IsNumber() @Min(-180) @Max(180) geoLongitud?: number;
  @IsOptional() @IsString() @MaxLength(2000) narrativa?: string;
}

export class ObjetoDto {
  @IsString() @MaxLength(120) nombre: string;
  @IsOptional() @IsString() @MaxLength(120) marcaModelo?: string;
  // cabe en numeric(12,2): hasta 9,999,999,999.99
  @IsOptional() @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @Max(9999999999.99)
  valorAproximado?: number;
  @IsOptional() @IsString() @MaxLength(255) descripcion?: string;
}

export class SospechosoDto {
  @IsOptional() @IsString() @MaxLength(1000) descripcionPersonal?: string;
  @IsOptional() @IsString() @MaxLength(1000) descripcionHuida?: string;
}

export class TestigoDto {
  @IsString() @MaxLength(120) nombre: string;
  @IsIn(['familia directa', 'familia indirecta', 'amigo y/o conocido', 'extraño'])
  relacion: string;
  @IsOptional() @IsString() @MaxLength(120) correo?: string;
  @IsOptional() @Matches(/^(\d{9})?$/, { message: 'El teléfono debe tener 9 dígitos' })
  telefono?: string;
}

export class EvidenciaDto {
  @IsString() @MaxLength(500) urlArchivo: string;
  @IsOptional() @IsString() @MaxLength(60) tipoArchivo?: string;
  @IsOptional() @IsString() @MaxLength(500) descripcion?: string;
}

export class EnviarDto {
  @IsArray() @IsString({ each: true })
  consentimientos: string[]; // ['truthfulness','data_processing']
}
