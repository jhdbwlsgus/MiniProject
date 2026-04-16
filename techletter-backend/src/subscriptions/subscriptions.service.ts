import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Subscription } from './subscription.entity';

@Injectable()
export class SubscriptionsService {
  constructor(
    @InjectRepository(Subscription)
    private subscriptionsRepository: Repository<Subscription>,
  ) {}

  create(userId: number) {
    const subscription = this.subscriptionsRepository.create({ userId });
    return this.subscriptionsRepository.save(subscription);
  }

  findAll() {
    return this.subscriptionsRepository.find();
  }

  async remove(userId: number) {
    return this.subscriptionsRepository.delete({ userId });
  }
}