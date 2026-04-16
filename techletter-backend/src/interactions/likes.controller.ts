import { Controller, Post, Delete, Param } from '@nestjs/common';
import { LikesService } from './likes.service';

@Controller('likes')
export class LikesController {
  constructor(private readonly likesService: LikesService) {}

  @Post(':newsId/:userId')
  create(@Param('newsId') newsId: string, @Param('userId') userId: string) {
    return this.likesService.create(+newsId, +userId);
  }

  @Delete(':newsId/:userId')
  remove(@Param('newsId') newsId: string, @Param('userId') userId: string) {
    return this.likesService.remove(+newsId, +userId);
  }
}