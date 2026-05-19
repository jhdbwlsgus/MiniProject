import { Body, Controller, Get, Param, Post, Query, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ReporterApplyDto } from './dto/reporter-apply.dto';
import { RejectReporterDto } from './dto/reject-reporter.dto';
import { ReporterStatus } from './reporter-profile.entity';
import { ReportersService } from './reporters.service';

@Controller('reporters')
export class ReportersController {
  constructor(private readonly reportersService: ReportersService) {}

  @Get()
  listApproved() {
    return this.reportersService.listApproved();
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  getMine(@Request() req: any) {
    return this.reportersService.getMine(req.user.id);
  }

  @Post('apply')
  @UseGuards(JwtAuthGuard)
  apply(@Request() req: any, @Body() body: any) {
    return this.reportersService.apply(req.user.id, body);
  }

  @Get('admin')
  @UseGuards(JwtAuthGuard)
  listForAdmin(@Request() req: any, @Query('status') status?: ReporterStatus) {
    if (req.user.role !== 'admin') return [];
    return this.reportersService.listForAdmin(status);
  }

  @Patch('admin/:id/status')
  @UseGuards(JwtAuthGuard)
  updateStatus(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: { status: ReporterStatus; reviewMessage?: string },
  ) {
    return this.reportersService.updateStatus(req.user.role, req.user.id, +id, body.status, body.reviewMessage);
  }

  @Get('me/dashboard')
  @UseGuards(JwtAuthGuard)
  getDashboard(@Request() req: any) {
    return this.reportersService.getDashboard(req.user.id, req.user.role);
  }

  @Get('me/feed')
  @UseGuards(JwtAuthGuard)
  listMyFeeds(@Request() req: any) {
    return this.reportersService.listMyFeeds(req.user.id, req.user.role);
  }

  @Get('me/subscribers')
  @UseGuards(JwtAuthGuard)
  listMySubscribers(@Request() req: any) {
    return this.reportersService.listMySubscribers(req.user.id, req.user.role);
  }

  @Post('me/feed')
  @UseGuards(JwtAuthGuard)
  createFeed(
    @Request() req: any,
    @Body() body: {
      type?: ReporterFeedType;
      title?: string;
      content?: string;
      linkUrl?: string;
      published?: boolean;
    },
  ) {
    return this.reportersService.createFeed(req.user.id, req.user.role, body);
  }

  @Get('user/:userId')
  getPublicProfileByUser(@Param('userId') userId: string) {
    return this.reportersService.getPublicProfileByUser(+userId);
  }

  @Post(':id/subscribe')
  @UseGuards(JwtAuthGuard)
  subscribe(@Request() req: any, @Param('id') id: string) {
    return this.reportersService.subscribe(req.user.id, +id);
  }

  @Delete(':id/subscribe')
  @UseGuards(JwtAuthGuard)
  unsubscribe(@Request() req: any, @Param('id') id: string) {
    return this.reportersService.unsubscribe(req.user.id, +id);
  }

  @Get(':slug')
  getPublicProfile(@Param('slug') slug: string) {
    return this.reportersService.getPublicProfile(slug);
  }
}
