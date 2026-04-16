import { Controller, Get, Post, Body, Param, Put, Delete } from '@nestjs/common';
import { TagsService } from './tags.service';
import { Tag } from './tag.entity';

@Controller('tags')
export class TagsController {
  constructor(private readonly tagsService: TagsService) {}

  @Post()
  create(@Body() tag: Partial<Tag>): Promise<Tag> {
    return this.tagsService.create(tag);
  }

  @Get()
  findAll(): Promise<Tag[]> {
    return this.tagsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<Tag> {
    return this.tagsService.findOne(+id);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() tag: Partial<Tag>): Promise<Tag> {
    return this.tagsService.update(+id, tag);
  }

  @Delete(':id')
  remove(@Param('id') id: string): Promise<void> {
    return this.tagsService.remove(+id);
  }
}