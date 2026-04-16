import { Controller, Get, Post, Body, Param, Put, Delete } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { Category } from './category.entity';

@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Post()
  create(@Body() category: Partial<Category>): Promise<Category> {
    return this.categoriesService.create(category);
  }

  @Get()
  findAll(): Promise<Category[]> {
    return this.categoriesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<Category> {
    return this.categoriesService.findOne(+id);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() category: Partial<Category>): Promise<Category> {
    return this.categoriesService.update(+id, category);
  }

  @Delete(':id')
  remove(@Param('id') id: string): Promise<void> {
    return this.categoriesService.remove(+id);
  }
}