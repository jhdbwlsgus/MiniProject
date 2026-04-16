import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LikesController } from './likes.controller';
import { LikesService } from './likes.service';
import { CommentsController } from './comments.controller';
import { CommentsService } from './comments.service';
import { BookmarksController } from './bookmarks.controller';
import { BookmarksService } from './bookmarks.service';
import { Like } from './entities/like.entity';
import { Comment } from './entities/comment.entity';
import { Bookmark } from './entities/bookmark.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Like, Comment, Bookmark])],
  controllers: [LikesController, CommentsController, BookmarksController],
  providers: [LikesService, CommentsService, BookmarksService],
  exports: [LikesService, CommentsService, BookmarksService],
})
export class InteractionsModule {}