import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SubscriptionsController } from './subscriptions.controller';
import { SubscriptionsService } from './subscriptions.service';
import { SubscriptionsScheduler } from './subscriptions.scheduler';
import { Subscription } from './subscription.entity';
import { Payment } from './payment.entity';
import { Bookmark } from '../interactions/entities/bookmark.entity';
import { Like } from '../interactions/entities/like.entity';
import { News } from '../news/news.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Subscription, Payment, Bookmark, Like, News])],
  controllers: [SubscriptionsController],
  providers: [SubscriptionsService, SubscriptionsScheduler],
  exports: [SubscriptionsService],
})
export class SubscriptionsModule {}
