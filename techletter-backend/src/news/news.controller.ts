import { Controller, Get, Post, Body, Param, Put, Delete } from '@nestjs/common';
import { NewsService } from './news.service';
import { News } from './news.entity';
import { CreateNewsDto } from './dto/create-news.dto';
import { UpdateNewsDto } from './dto/update-news.dto';

@Controller('news')
export class NewsController {
  constructor(private readonly newsService: NewsService) {}

  @Post()
  create(@Body() createNewsDto: CreateNewsDto): Promise<News> {
    return this.newsService.create(createNewsDto);
  }

  @Get()
  findAll(): Promise<News[]> {
    return this.newsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<News> {
    return this.newsService.findOne(+id);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() updateNewsDto: UpdateNewsDto): Promise<News> {
    return this.newsService.update(+id, updateNewsDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string): Promise<void> {
    return this.newsService.remove(+id);
  }
}