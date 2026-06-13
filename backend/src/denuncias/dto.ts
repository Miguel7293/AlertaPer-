import { IsArray, IsIn, IsNumber, IsOptional, IsString } from 'class-validator';

export class ActualizarDenunciaDto {
  @IsOptional() @IsIn(['robo', 'hurto']) tipo?: 'robo' | 'hurto';
  @IsOptional() @IsString() hora?: string;
  @IsOptional() @IsString() departamento?: string;
  @IsOptional() @IsString() provincia?: string;
  @IsOptional() @IsString() distrito?: string;
  @IsOptional() @IsString() referenciaUbicacion?: string;
  @IsOptional() @IsNumber() geoLatitud?: number;
  @IsOptional() @IsNumber() geoLongitud?: number;
  @IsOptional() @IsString() narrativa?: string;
}

export class ObjetoDto {
  @IsString() nombre: string;
  @IsOptional() @IsString() marcaModelo?: string;
  @IsOptional() @IsNumber() valorAproximado?: number;
  @IsOptional() @IsString() descripcion?: string;
}

export class SospechosoDto {
  @IsOptional() @IsString() descripcionPersonal?: string;
  @IsOptional() @IsString() descripcionHuida?: string;
}

export class TestigoDto {
  @IsString() nombre: string;
  @IsIn(['familia directa', 'familia indirecta', 'amigo y/o conocido', 'extraño'])
  relacion: string;
  @IsOptional() @IsString() correo?: string;
  @IsOptional() @IsString() telefono?: string;
}

export class EvidenciaDto {
  @IsString() urlArchivo: string;
  @IsOptional() @IsString() tipoArchivo?: string;
  @IsOptional() @IsString() descripcion?: string;
}

export class EnviarDto {
  @IsArray() @IsString({ each: true })
  consentimientos: string[]; // ['truthfulness','data_processing']
}
