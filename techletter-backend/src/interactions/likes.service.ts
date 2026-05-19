import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Like } from './entities/like.entity';
import { News } from '../news/news.entity';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class LikesService {
  constructor(
    @InjectRepository(Like)
    private likeRepository: Repository<Like>,
    @InjectRepository(News)
    private newsRepository: Repository<News>,
    private readonly notificationsService: NotificationsService,
  ) {}

  async toggle(userId: number, newsId: number) {
    const existing = await this.likeRepository.findOne({
      where: { userId, newsId },
    });
    if (existing) {
      await this.likeRepository.remove(existing);
      await this.newsRepository.decrement({ id: newsId }, 'likeCount', 1);
      const news = await this.newsRepository.findOne({ where: { id: newsId } });
      if (news && news.likeCount < 0) {
        news.likeCount = 0;
        await this.newsRepository.save(news);
      }
      return { liked: false, likeCount: Math.max(news?.likeCount ?? 0, 0) };
    }
    const like = this.likeRepository.create({ userId, newsId });
    await this.likeRepository.save(like);
    await this.newsRepository.increment({ id: newsId }, 'likeCount', 1);
    const news = await this.newsRepository.findOne({ where: { id: newsId } });
    if (news) {
      await this.notificationsService.notifyArticleLike(news, userId);
    }
    return { liked: true, likeCount: news?.likeCount ?? 0 };
  }

  async count(newsId: number) {
    return this.likeRepository.count({ where: { newsId } });
  }
}
