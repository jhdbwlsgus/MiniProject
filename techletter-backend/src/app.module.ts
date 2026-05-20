import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { CacheModule } from '@nestjs/cache-manager';
import { redisStore } from 'cache-manager-ioredis-yet';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { NewsModule } from './news/news.module';
import { ChatbotModule } from './chatbot/chatbot.module';
import { CategoriesModule } from './categories/categories.module';
import { TagsModule } from './tags/tags.module';
import { InteractionsModule } from './interactions/interactions.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { StatsModule } from './stats/stats.module';
import { UploadModule } from './upload/upload.module';
import { InterviewsModule } from './interviews/interviews.module';
import { ReportersModule } from './reporters/reporters.module';
import { NotificationsModule } from './notifications/notifications.module';
import { SearchModule } from './search/search.module';
import { BullModule } from '@nestjs/bullmq';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../.env'],
    }),
    ScheduleModule.forRoot(),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        connection: {
          url: configService.get<string>('REDIS_URL'),
          tls: {}, // ✅ Upstash는 보안 접속(TLS)이 필수입니다!
        },
      }),
    }),
    
    // 🟢 방어막 셋팅: 1분(60초) 동안 동일 IP에서 최대 100번만 요청 가능!
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 100,
    }]),
    CacheModule.registerAsync({
      isGlobal: true,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        store: redisStore,
        url: configService.get<string>('REDIS_URL'), // .env에서 주소 가져오기
        ttl: 300000, // 기본 포스트잇 유지 시간: 5분 (300,000 밀리초)
      }),
    }),

    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: process.env.DB_HOST,
        port: parseInt(process.env.DB_PORT || '6543', 10),
        username: process.env.DB_USERNAME,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_DATABASE,
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: true,
        logging: false,
        ssl: {
          rejectUnauthorized: false,
        },
      }),
    }),
    UsersModule,
    AuthModule,
    NewsModule,
    CategoriesModule,
    TagsModule,
    ChatbotModule,
    InteractionsModule,
    SubscriptionsModule,
    StatsModule,
    UploadModule,
    InterviewsModule,
    ReportersModule,
    NotificationsModule,
    SearchModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // 🟢 앱 전체에 Throttler(요청 제한) 방어막 가드 작동!
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}