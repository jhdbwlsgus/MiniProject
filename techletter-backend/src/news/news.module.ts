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
import { CacheModule } from '@nestjs/cache-manager';
import { BullModule } from '@nestjs/bullmq';

@Module({
  imports: [
    TypeOrmModule.forFeature([News, NewsView, Tag, Like, Subscription, ReporterProfile]),
    AuthModule,
    NotificationsModule,
    CacheModule.register(),
    BullModule.registerQueue({ name: 'ai-summary' }), // ✅ 큐 등록
  ],
  controllers: [NewsController],
  providers: [NewsService, NewsScheduler], // ✅ 나중에 여기에 AiSummaryProcessor 추가할 예정
  exports: [NewsService],
})
export class NewsModule {}