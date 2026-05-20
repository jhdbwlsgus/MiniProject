import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CacheModule } from '@nestjs/cache-manager'; // 👈 1. 캐시 모듈 가져오기 추가!

import { News } from '../news/news.entity';
import { User } from '../users/user.entity';
import { Like } from '../interactions/entities/like.entity';
import { Comment } from '../interactions/entities/comment.entity';
import { Subscription } from '../subscriptions/subscription.entity';
import { NewsletterSend } from '../newsletter/newsletter.entity';
import { NewsView } from '../news/news-view.entity';
import { StatsService } from './stats.service';
import { StatsController } from './stats.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([News, User, Like, Comment, Subscription, NewsletterSend, NewsView]),
    AuthModule,
    CacheModule.register(), // 👈 2. 통계 모듈에 포스트잇 사용 권한 부여!
  ],
  providers: [StatsService],
  controllers: [StatsController],
  exports: [StatsService],
})
export class StatsModule {}