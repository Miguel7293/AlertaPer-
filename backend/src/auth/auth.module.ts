import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { OficialController } from './oficial.controller';
import { EmailService } from './email.service';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { RolesGuard } from '../common/roles.guard';

@Module({
  imports: [JwtModule.register({})],
  controllers: [AuthController, OficialController],
  providers: [AuthService, EmailService, JwtAuthGuard, RolesGuard],
  exports: [AuthService, JwtModule, JwtAuthGuard],
})
export class AuthModule {}
