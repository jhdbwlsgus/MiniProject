import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Bookmark } from './entities/bookmark.entity';

@Injectable()
export class BookmarksService {
  constructor(
    @InjectRepository(Bookmark)
    private bookmarksRepository: Repository<Bookmark>,
  ) {}

  async create(newsId: number, userId: number) {
    const bookmark = this.bookmarksRepository.create({ newsId, userId });
    return this.bookmarksRepository.save(bookmark);
  }

  findByUser(userId: number) {
    return this.bookmarksRepository.find({ where: { userId } });
  }

  async remove(newsId: number, userId: number) {
    return this.bookmarksRepository.delete({ newsId, userId });
  }
}