import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { NewsModule } from './news/news.module';
import { CategoriesModule } from './categories/categories.module';
import { TagsModule } from './tags/tags.module';
import { InteractionsModule } from './interactions/interactions.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { NewsletterModule } from './newsletter/newsletter.module';
import { NotificationModule } from './notification/notification.module';
import { PushModule } from './push/push.module';
import { StatsModule } from './stats/stats.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST,
      port: +process.env.DB_PORT,
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      entities: ['dist/**/*.entity{.ts,.js}'],
      synchronize: true,
    }),
    AuthModule,
    UsersModule,
    NewsModule,
    CategoriesModule,
    TagsModule,
    InteractionsModule,
    SubscriptionsModule,
    NewsletterModule,
    NotificationModule,
    PushModule,
    StatsModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}