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
import { CacheModule } from '@nestjs/cache-manager'; // 👈 잘 가져오셨습니다!

@Module({
  imports: [
    TypeOrmModule.forFeature([News, NewsView, Tag, Like, Subscription, ReporterProfile]), 
    AuthModule, 
    NotificationsModule,
    CacheModule.register(), // 👈 🟢 여기에 포스트잇 권한을 추가했습니다!
  ],
  providers: [NewsService, NewsScheduler],
  controllers: [NewsController],
  exports: [NewsService],
})
export class NewsModule {}