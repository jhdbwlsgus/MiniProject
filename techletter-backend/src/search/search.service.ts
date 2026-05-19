import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { News, NewsStatus } from '../news/news.entity';
import { ReporterProfile, ReporterStatus } from '../reporters/reporter-profile.entity';

@Injectable()
export class SearchService {
  constructor(
    @InjectRepository(News)
    private newsRepo: Repository<News>,
    @InjectRepository(ReporterProfile)
    private reporterRepo: Repository<ReporterProfile>,
  ) {}

  async search(query: string, page = 1, limit = 10) {
    if (!query || query.trim().length === 0) {
      return { items: [], total: 0, page, totalPages: 0 };
    }

    const keyword = `%${query.trim()}%`;
    const skip = (page - 1) * limit;

    const [items, total] = await this.newsRepo
      .createQueryBuilder('news')
      .leftJoinAndSelect('news.category', 'category')
      .leftJoinAndSelect('news.tags', 'tags')
      .where('news.status = :status', { status: 'published' })
      .andWhere(
        '(news.title LIKE :keyword OR news.lead LIKE :keyword OR news.content LIKE :keyword)',
        { keyword },
      )
      .orderBy('news.publishedAt', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return {
      items,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async preview(query: string, limit = 5) {
    const cleanQuery = query?.trim().replace(/^#/, '');
    if (!cleanQuery) {
      return { news: [], reporters: [] };
    }

    const safeLimit = Math.min(Math.max(limit, 1), 8);
    const keyword = `%${cleanQuery}%`;
    const numericId = Number(cleanQuery);
    const hasNumericId = Number.isInteger(numericId) && numericId > 0;

    const reporterQuery = this.reporterRepo
      .createQueryBuilder('reporter')
      .leftJoinAndSelect('reporter.user', 'user')
      .where('reporter.status = :status', { status: ReporterStatus.APPROVED })
      .andWhere(
        hasNumericId
          ? '(reporter.id = :numericId OR reporter.userId = :numericId OR reporter.slug LIKE :keyword OR reporter.displayName LIKE :keyword OR user.nickname LIKE :keyword OR user.email LIKE :keyword)'
          : '(reporter.slug LIKE :keyword OR reporter.displayName LIKE :keyword OR user.nickname LIKE :keyword OR user.email LIKE :keyword)',
        { keyword, numericId },
      )
      .orderBy('reporter.approvedAt', 'DESC')
      .addOrderBy('reporter.createdAt', 'DESC')
      .take(safeLimit);

    const reporters = await reporterQuery.getMany();
    if (reporters.length > 0) {
      return {
        news: [],
        reporters: reporters.map((reporter) => this.toReporterPreview(reporter)),
      };
    }

    const news = await this.newsRepo
      .createQueryBuilder('news')
      .leftJoinAndSelect('news.category', 'category')
      .leftJoinAndSelect('news.author', 'author')
      .leftJoinAndSelect('news.tags', 'tags')
      .where('news.status = :status', { status: NewsStatus.PUBLISHED })
      .andWhere(
        hasNumericId
          ? '(news.id = :numericId OR news.title LIKE :keyword OR news.lead LIKE :keyword OR news.content LIKE :keyword OR tags.name LIKE :keyword OR tags.slug LIKE :keyword)'
          : '(news.title LIKE :keyword OR news.lead LIKE :keyword OR news.content LIKE :keyword OR tags.name LIKE :keyword OR tags.slug LIKE :keyword)',
        { keyword, numericId },
      )
      .orderBy('news.publishedAt', 'DESC')
      .addOrderBy('news.createdAt', 'DESC')
      .take(safeLimit)
      .getMany();

    return {
      news: news.map((item) => ({
        id: item.id,
        title: item.title,
        lead: item.lead,
        thumbnailUrl: item.thumbnailUrl,
        viewCount: item.viewCount,
        category: item.category ? { id: item.category.id, name: item.category.name } : null,
        author: item.author ? {
          id: item.author.id,
          nickname: item.author.nickname,
          profileImage: item.author.profileImage,
        } : null,
      })),
      reporters: [],
    };
  }

  private toReporterPreview(reporter: ReporterProfile) {
    return {
      id: reporter.id,
      userId: reporter.userId,
      slug: reporter.slug,
      displayName: reporter.displayName,
      headline: reporter.headline,
      profileImage: reporter.profileImage || reporter.user?.profileImage || null,
      user: reporter.user ? {
        id: reporter.user.id,
        nickname: reporter.user.nickname,
        profileImage: reporter.user.profileImage,
      } : null,
    };
  }
}
