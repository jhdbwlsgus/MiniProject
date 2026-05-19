import { Controller, Get, Query } from '@nestjs/common';
import { SearchService } from './search.service';

@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  // GET /search?q=키워드&page=1&limit=10
  @Get()
  search(
    @Query('q') q: string,
    @Query('page') page = '1',
    @Query('limit') limit = '10',
  ) {
    return this.searchService.search(q, +page, +limit);
  }

  @Get('preview')
  preview(@Query('q') q: string, @Query('limit') limit = '5') {
    return this.searchService.preview(q, +limit || 5);
  }
}
