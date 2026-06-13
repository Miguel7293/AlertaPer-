import { IsEmail, IsOptional, IsString, Matches, MinLength } from 'class-validator';

export class RegisterDto {
  @Matches(/^\d{8}$/, { message: 'dni debe tener 8 dígitos' })
  dni: string;

  @IsEmail({}, { message: 'correo inválido' })
  correoElectronico: string;

  @IsString() primerNombre: string;
  @IsString() apellidoPaterno: string;
  @IsString() apellidoMaterno: string;
  @IsString() fechaNacimiento: string;

  @IsOptional() @IsString() fechaEmisionDni?: string;
  @IsOptional() @IsString() telefono?: string;

  @MinLength(8, { message: 'la contraseña debe tener al menos 8 caracteres' })
  contrasena: string;
}

export class LoginDto {
  @IsString() identificador: string; // dni o correo
  @IsString() contrasena: string;
}

export class EmailVerifyDto {
  @IsString() codigo: string;
}
