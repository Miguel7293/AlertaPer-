import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { IdentityService } from './identity.service';
import { JwtAuthGuard, AuthUser } from '../common/jwt-auth.guard';
import { CurrentUser } from '../common/current-user.decorator';
import {
  BasicValidationDto,
  ConsentDto,
  FaceCaptureDto,
  OtpSendDto,
  OtpVerifyDto,
} from './dto';

@UseGuards(JwtAuthGuard)
@Controller()
export class IdentityController {
  constructor(private readonly identity: IdentityService) {}

  @Post('identity/basic')
  basic(@CurrentUser() user: AuthUser, @Body() dto: BasicValidationDto) {
    return this.identity.basic(user.id, dto);
  }

  @Post('identity/reniec-check')
  reniec(@CurrentUser() user: AuthUser) {
    return this.identity.reniecCheck(user.id);
  }

  @Get('identity/status')
  status(@CurrentUser() user: AuthUser) {
    return this.identity.status(user.id);
  }

  @Post('identity/otp/send')
  otpSend(@CurrentUser() user: AuthUser, @Body() dto: OtpSendDto) {
    return this.identity.otpSend(user.id, dto.channel);
  }

  @Post('identity/otp/verify')
  otpVerify(@CurrentUser() user: AuthUser, @Body() dto: OtpVerifyDto) {
    return this.identity.otpVerify(user.id, dto.code);
  }

  @Post('consents')
  consent(@CurrentUser() user: AuthUser, @Body() dto: ConsentDto) {
    return this.identity.consent(user.id, dto);
  }

  @Post('face-captures')
  faceCapture(@CurrentUser() user: AuthUser, @Body() dto: FaceCaptureDto) {
    return this.identity.faceCapture(user.id, dto);
  }
}
