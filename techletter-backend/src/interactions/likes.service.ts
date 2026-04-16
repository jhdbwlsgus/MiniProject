import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Like } from './entities/like.entity';

@Injectable()
export class LikesService {
  constructor(
    @InjectRepository(Like)
    private likesRepository: Repository<Like>,
  ) {}

  async create(newsId: number, userId: number) {
    const like = this.likesRepository.create({ newsId, userId });
    return this.likesRepository.save(like);
  }

  async remove(newsId: number, userId: number) {
    return this.likesRepository.delete({ newsId, userId });
  }
}