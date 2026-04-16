import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Comment } from './entities/comment.entity';

@Injectable()
export class CommentsService {
  constructor(
    @InjectRepository(Comment)
    private commentsRepository: Repository<Comment>,
  ) {}

  create(comment: Partial<Comment>) {
    const newComment = this.commentsRepository.create(comment);
    return this.commentsRepository.save(newComment);
  }

  findByNews(newsId: number) {
    return this.commentsRepository.find({ where: { newsId } });
  }

  async remove(id: number) {
    return this.commentsRepository.delete(id);
  }
}