import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { News } from './news.entity';
import { NewsView } from './news-view.entity';
import { Tag } from '../tags/tag.entity';
import { Like } from '../interactions/entities/like.entity';
import { NewsService } from './news.service';
import { NewsController } from './news.controller';
import { NewsScheduler } from './news.scheduler';
import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { Subscription } from '../subscriptions/subscription.entity';
import { ReporterProfile } from '../reporters/reporter-profile.entity';

@Module({
  imports: [TypeOrmModule.forFeature([News, NewsView, Tag, Like, Subscription, ReporterProfile]), AuthModule, NotificationsModule],
  providers: [NewsService, NewsScheduler],
  controllers: [NewsController],
  exports: [NewsService],
})
export class NewsModule {}
