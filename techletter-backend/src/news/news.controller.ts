import {
  ForbiddenException,
  Controller, Get, Post, Put, Delete,
  Param, Body, Query, UseGuards, Request, Headers, Ip
} from '@nestjs/common';
import { NewsService, RewriteSelectionDto } from './news.service';
import { CreateNewsDto } from './dto/create-news.dto';
import { UpdateNewsDto } from './dto/update-news.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/optional-jwt-auth.guard';
import { UserRole } from '../users/user.entity';

@Controller('news')
export class NewsController {
  constructor(private readonly newsService: NewsService) {}

  @Get()
  findAll(
    @Query('page') page: string,
    @Query('limit') limit: string,
    @Query('categoryId') categoryId: string,
    @Query('status') status: string,
    @Query('search') search: string,
    @Query('tag') tag: string,
  ) {
    return this.newsService.findAll(+page || 1, +limit || 10, categoryId ? +categoryId : undefined, status, search, tag);
  }

  @Get('home')
  getHomeFeed() {
    return this.newsService.getHomeFeed();
  }

  @Get('admin')
  @UseGuards(JwtAuthGuard)
  findAllAdmin(
    @Query('page') page: string,
    @Query('limit') limit: string,
    @Query('status') status: string,
    @Query('mine') mine: string,
    @Request() req: any,
  ) {
    return this.newsService.findAllAdmin(
      +page || 1,
      +limit || 20,
      status,
      mine === 'true' || req.user.role !== 'admin' ? req.user.id : undefined,
    );
  }

  @Get('me/view-history')
  @UseGuards(JwtAuthGuard)
  getMyViewHistory(@Request() req: any) {
    return this.newsService.getMyViewHistory(req.user.id);
  }

  @Get('slug/:slug')
  @UseGuards(OptionalJwtAuthGuard)
  findBySlug(@Param('slug') slug: string, @Request() req: any) {
    return this.newsService.findBySlug(slug, req.user);
  }

  @Get('naver/search')
  searchNaverNews(
    @Query('query') query: string,
    @Query('display') display: string,
    @Query('start') start: string,
    @Query('sort') sort: 'sim' | 'date',
  ) {
    return this.newsService.searchNaverNews(
      query,
      +display || 10,
      +start || 1,
      sort === 'sim' ? 'sim' : 'date',
    );
  }

  @Post('ai/analyze')
  @UseGuards(JwtAuthGuard)
  analyzeWithAi(@Body() dto: { title?: string; content?: string; tags?: string[] }) {
    return this.newsService.analyzeNews(dto);
  }

  @Post('ai/spellcheck')
  @UseGuards(JwtAuthGuard)
  spellcheckWithAi(@Body() dto: { text?: string }) {
    return this.newsService.spellcheckText(dto);
  }

  @Post('ai/rewrite-selection')
  @UseGuards(JwtAuthGuard)
  rewriteSelectionWithAi(@Body() dto: { text?: string; mode?: string; references?: RewriteSelectionDto['references'] }) {
    return this.newsService.rewriteSelection(dto);
  }

  @Post('ai/translate-selection')
  @UseGuards(JwtAuthGuard)
  translateSelectionWithAi(@Body() dto: { text?: string; targetLanguage?: string }) {
    return this.newsService.translateSelection(dto);
  }

  // src/news/news.controller.ts

  @Get(':id')
  @UseGuards(OptionalJwtAuthGuard)
  async findOne(
    @Param('id') id: string, 
    @Request() req: any,
    @Ip() ip: string 
  ) {
    const userId = req.user?.id;
    const clientIp = ip || req.ip || 'unknown_ip';
    
    // 💡 viewToken 검사를 과감히 삭제하고 무조건 실행되게 합니다.
    // (어뷰징은 서비스 계층의 Redis가 다 막아주니까 안전합니다!)
    await this.newsService.incrementViewCount(+id, clientIp, userId);
    
    return this.newsService.findOne(+id, req.user);
  }

  @Post(':id/view-history')
  @UseGuards(JwtAuthGuard)
  recordViewHistory(@Param('id') id: string, @Request() req: any) {
    return this.newsService.recordViewHistory(req.user.id, +id);
  }

  @Post(':id/share')
  @UseGuards(OptionalJwtAuthGuard) // 👈 로그인 유저인지 확인하기 위해 추가
  recordShare(
    @Param('id') id: string,
    @Request() req: any, // 👈 추가
    @Ip() ip: string     // 👈 추가
  ) {
    // ✅ 서비스로 IP와 로그인한 유저의 ID를 함께 넘겨줍니다.
    const userId = req.user?.id;
    const clientIp = ip || req.ip || 'unknown_ip';
    
    return this.newsService.incrementShareCount(+id, clientIp, userId);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Body() dto: CreateNewsDto, @Request() req: any) {
    this.assertReporterOrAdmin(req.user);
    return this.newsService.create(dto, req.user);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  update(@Param('id') id: string, @Body() dto: UpdateNewsDto, @Request() req: any) {
    return this.newsService.update(+id, dto, req.user);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  remove(@Param('id') id: string, @Request() req: any) {
    return this.newsService.remove(+id, req.user);
  }

  private assertReporterOrAdmin(user: { role?: string }) {
    if (![UserRole.REPORTER, UserRole.ADMIN].includes(user.role as UserRole)) {
      throw new ForbiddenException('기자 승인 후 기사를 작성할 수 있습니다.');
    }
  }
}
