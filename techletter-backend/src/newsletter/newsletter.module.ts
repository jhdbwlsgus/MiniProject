import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { NewsletterController } from './newsletter.controller';
import { NewsletterService } from './newsletter.service';
import { NewsletterSend } from './newsletter-send.entity';
import { SendLog } from './send-log.entity';
import { NewsletterScheduler } from './scheduler/newsletter.scheduler';

@Module({
  imports: [
    TypeOrmModule.forFeature([NewsletterSend, SendLog]),
    ScheduleModule.forRoot(),
  ],
  controllers: [NewsletterController],
  providers: [NewsletterService, NewsletterScheduler],
  exports: [NewsletterService],
})
export class NewsletterModule {}