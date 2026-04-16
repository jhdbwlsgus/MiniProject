import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { NewsletterService } from '../newsletter.service';

@Injectable()
export class NewsletterScheduler {
  constructor(private readonly newsletterService: NewsletterService) {}

  @Cron(CronExpression.EVERY_WEEK)
  async handleWeeklyNewsletter() {
    // Implement weekly newsletter sending
    console.log('Sending weekly newsletter...');
  }
}