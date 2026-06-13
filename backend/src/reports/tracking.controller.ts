import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import { ReportsService } from './reports.service';

// Public tracking — no auth, requires tracking code + DNI to match.
@Controller('track')
export class TrackingController {
  constructor(private readonly reports: ReportsService) {}

  @Get()
  track(@Query('code') code: string, @Query('dni') dni: string) {
    if (!code || !dni) throw new BadRequestException('code and dni are required');
    return this.reports.track(code, dni);
  }
}
