import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { News } from '../news/news.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { User } from '../users/user.entity';
import { ReporterFeed } from './reporter-feed.entity';
import { ReporterProfile } from './reporter-profile.entity';
import { ReporterSubscription } from './reporter-subscription.entity';
import { ReportersController } from './reporters.controller';
import { ReportersService } from './reporters.service';

@Module({
  imports: [TypeOrmModule.forFeature([ReporterProfile, ReporterFeed, ReporterSubscription, User, News]), NotificationsModule],
  controllers: [ReportersController],
  providers: [ReportersService],
  exports: [ReportersService],
})
export class ReportersModule {}
