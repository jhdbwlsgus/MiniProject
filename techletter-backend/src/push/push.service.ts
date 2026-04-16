import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PushSubscription } from './push-subscription.entity';

@Injectable()
export class PushService {
  constructor(
    @InjectRepository(PushSubscription)
    private pushSubscriptionRepository: Repository<PushSubscription>,
  ) {}

  async subscribe(subscription: any) {
    const pushSub = this.pushSubscriptionRepository.create(subscription);
    return this.pushSubscriptionRepository.save(pushSub);
  }

  async sendNotification(data: any) {
    // Implement push notification sending
    console.log('Sending push notification:', data);
  }
}