import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tag } from './tag.entity';

@Injectable()
export class TagsService {
  constructor(
    @InjectRepository(Tag)
    private tagsRepository: Repository<Tag>,
  ) {}

  create(tag: Partial<Tag>): Promise<Tag> {
    const newTag = this.tagsRepository.create(tag);
    return this.tagsRepository.save(newTag);
  }

  findAll(): Promise<Tag[]> {
    return this.tagsRepository.find();
  }

  findOne(id: number): Promise<Tag> {
    return this.tagsRepository.findOneBy({ id });
  }

  async update(id: number, tag: Partial<Tag>): Promise<Tag> {
    await this.tagsRepository.update(id, tag);
    return this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    await this.tagsRepository.delete(id);
  }
}