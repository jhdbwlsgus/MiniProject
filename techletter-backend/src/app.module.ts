import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
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

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../.env'],
    }),
    ScheduleModule.forRoot(),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: process.env.DB_HOST,
        port: parseInt(process.env.DB_PORT || '6543', 10),
        username: process.env.DB_USERNAME,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_DATABASE, // 👈 쉼표(,) 추가!
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: true,
        logging: false,
        ssl: {
          rejectUnauthorized: false, // ☁️ 클라우드 DB 연결을 위한 필수 보안 설정!
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
  providers: [AppService],
})
export class AppModule {}