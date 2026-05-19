import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Comment } from './entities/comment.entity';
import { News } from '../news/news.entity';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class CommentsService {
  constructor(
    @InjectRepository(Comment)
    private commentRepository: Repository<Comment>,
    @InjectRepository(News)
    private newsRepository: Repository<News>,
    private readonly notificationsService: NotificationsService,
  ) {}

  async findByNews(newsId: number) {
    return this.commentRepository.find({
      where: { newsId },
      order: { isBest: 'DESC', likeCount: 'DESC', createdAt: 'ASC' },
      relations: ['user'],
    });
  }

  async create(content: string, userId: number, newsId: number) {
    const comment = this.commentRepository.create({ content, userId, newsId });
    const saved = await this.commentRepository.save(comment);
    const news = await this.newsRepository.findOne({ where: { id: newsId } });
    if (news) {
      await this.notificationsService.notifyArticleComment(news, userId, content);
    }
    return saved;
  }

  async update(id: number, content: string, userId: number) {
    const comment = await this.commentRepository.findOne({ where: { id } });
    if (!comment) throw new NotFoundException('댓글을 찾을 수 없습니다.');
    if (comment.userId !== userId) throw new ForbiddenException('권한이 없습니다.');
    comment.content = content;
    return this.commentRepository.save(comment);
  }

  async remove(id: number, userId: number) {
    const comment = await this.commentRepository.findOne({ where: { id } });
    if (!comment) throw new NotFoundException('댓글을 찾을 수 없습니다.');
    if (comment.userId !== userId) throw new ForbiddenException('권한이 없습니다.');
    return this.commentRepository.remove(comment);
  }

  async likeComment(id: number) {
    await this.commentRepository.increment({ id }, 'likeCount', 1);
    return { success: true };
  }
}
