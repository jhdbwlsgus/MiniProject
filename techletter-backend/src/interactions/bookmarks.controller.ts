import { Controller, Get, Post, Delete, Param } from '@nestjs/common';
import { BookmarksService } from './bookmarks.service';

@Controller('bookmarks')
export class BookmarksController {
  constructor(private readonly bookmarksService: BookmarksService) {}

  @Post(':newsId/:userId')
  create(@Param('newsId') newsId: string, @Param('userId') userId: string) {
    return this.bookmarksService.create(+newsId, +userId);
  }

  @Get(':userId')
  findByUser(@Param('userId') userId: string) {
    return this.bookmarksService.findByUser(+userId);
  }

  @Delete(':newsId/:userId')
  remove(@Param('newsId') newsId: string, @Param('userId') userId: string) {
    return this.bookmarksService.remove(+newsId, +userId);
  }
}