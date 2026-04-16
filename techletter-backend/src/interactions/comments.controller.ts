import { Controller, Get, Post, Delete, Param, Body } from '@nestjs/common';
import { CommentsService } from './comments.service';
import { Comment } from './entities/comment.entity';

@Controller('comments')
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Post()
  create(@Body() comment: Partial<Comment>) {
    return this.commentsService.create(comment);
  }

  @Get(':newsId')
  findByNews(@Param('newsId') newsId: string) {
    return this.commentsService.findByNews(+newsId);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.commentsService.remove(+id);
  }
}