import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { JwtAuthGuard, AuthUser } from '../common/jwt-auth.guard';
import { CurrentUser } from '../common/current-user.decorator';
import { EvidenceDto, ItemDto, SubmitDto, UpdateReportDto } from './dto';

@UseGuards(JwtAuthGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Post()
  create(@CurrentUser() user: AuthUser) {
    return this.reports.create(user.id);
  }

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.reports.list(user.id);
  }

  @Get(':id')
  detail(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.reports.detail(user.id, id);
  }

  @Patch(':id')
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateReportDto) {
    return this.reports.update(user.id, id, dto);
  }

  @Post(':id/items')
  addItem(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: ItemDto) {
    return this.reports.addItem(user.id, id, dto);
  }

  @Post(':id/evidence')
  addEvidence(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: EvidenceDto) {
    return this.reports.addEvidence(user.id, id, dto);
  }

  @Post(':id/submit')
  submit(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: SubmitDto) {
    return this.reports.submit(user.id, id, dto);
  }

  @Get(':id/receipt')
  receipt(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.reports.receipt(user.id, id);
  }
}
