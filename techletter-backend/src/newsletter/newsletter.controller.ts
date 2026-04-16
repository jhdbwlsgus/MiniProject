import { Controller, Get, Post, Body } from '@nestjs/common';
import { NewsletterService } from './newsletter.service';

@Controller('newsletter')
export class NewsletterController {
  constructor(private readonly newsletterService: NewsletterService) {}

  @Post('send')
  send(@Body() data: any) {
    return this.newsletterService.sendNewsletter(data);
  }

  @Get('logs')
  getLogs() {
    return this.newsletterService.getSendLogs();
  }
}