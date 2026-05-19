import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Like } from './entities/like.entity';
import { Comment } from './entities/comment.entity';
import { Bookmark } from './entities/bookmark.entity';
import { News } from '../news/news.entity';
import { LikesService } from './likes.service';
import { CommentsService } from './comments.service';
import { BookmarksService } from './bookmarks.service';
import { LikesController } from './likes.controller';
import { CommentsController } from './comments.controller';
import { BookmarksController } from './bookmarks.controller';
import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Like, Comment, Bookmark, News]),
    AuthModule,
    NotificationsModule,
  ],
  providers: [LikesService, CommentsService, BookmarksService],
  controllers: [LikesController, CommentsController, BookmarksController],
  exports: [LikesService, CommentsService, BookmarksService],
})
export class InteractionsModule {}
