import { IsEmail, IsIn, IsOptional, IsString, IsUUID, Matches, MaxLength, MinLength } from 'class-validator';

export class RegisterDto {
  @Matches(/^\d{8}$/, { message: 'El DNI debe tener 8 dígitos' })
  dni: string;

  @IsEmail({}, { message: 'Correo inválido' })
  @MaxLength(120, { message: 'El correo es demasiado largo' })
  correoElectronico: string;

  @IsString() @MaxLength(60, { message: 'Nombre demasiado largo' })
  primerNombre: string;

  @IsString() @MaxLength(60, { message: 'Apellido demasiado largo' })
  apellidoPaterno: string;

  @IsString() @MaxLength(60, { message: 'Apellido demasiado largo' })
  apellidoMaterno: string;

  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Fecha de nacimiento inválida' })
  fechaNacimiento: string;

  @IsOptional() @IsString() @MaxLength(20)
  fechaEmisionDni?: string;

  // teléfono peruano: exactamente 9 dígitos (o vacío)
  @IsOptional()
  @Matches(/^(\d{9})?$/, { message: 'El teléfono debe tener 9 dígitos' })
  telefono?: string;

  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  @MaxLength(72, { message: 'La contraseña no puede superar 72 caracteres' })
  contrasena: string;
}

export class LoginDto {
  @IsString() @MaxLength(120)
  identificador: string; // dni o correo

  @IsString() @MaxLength(72)
  contrasena: string;
}

export class EmailVerifyDto {
  @Matches(/^\d{6}$/, { message: 'El código debe tener 6 dígitos' })
  codigo: string;
}

export class LoginOficialDto {
  @IsString() @MaxLength(120)
  usuario: string; // usuario, correo o dni

  @IsString() @MaxLength(72)
  contrasena: string;
}

export class CrearOficialDto {
  @IsString() @MaxLength(120) usuario: string;
  @IsEmail({}, { message: 'Correo inválido' }) @MaxLength(120) correoElectronico: string;
  @Matches(/^\d{8}$/, { message: 'El DNI debe tener 8 dígitos' }) dni: string;
  @IsString() @MaxLength(60) primerNombre: string;
  @IsString() @MaxLength(60) apellidoPaterno: string;
  @IsString() @MaxLength(60) apellidoMaterno: string;
  @MinLength(8) @MaxLength(72) contrasena: string;

  // solo lo usa el Super Admin; el Encargado siempre crea 'policia' en su comisaría
  @IsOptional() @IsIn(['encargado_comisaria', 'policia', 'fiscal'])
  rol?: string;

  @IsOptional() @IsUUID()
  comisariaId?: string;
}

export class CrearComisariaDto {
  @IsString() @MinLength(3) @MaxLength(120)
  descripcion: string;

  @IsString() @MinLength(2) @MaxLength(80)
  departamento: string;

  @IsString() @MinLength(2) @MaxLength(80)
  provincia: string;

  @IsString() @MinLength(2) @MaxLength(80)
  distrito: string;

  @IsString() @MinLength(5) @MaxLength(180)
  direccion: string;

  @IsOptional() @IsString() @MaxLength(180)
  ubicacion?: string;
}
