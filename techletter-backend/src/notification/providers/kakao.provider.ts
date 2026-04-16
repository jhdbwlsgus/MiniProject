import { Injectable } from '@nestjs/common';
import { NotificationService } from '../notification.interface';

@Injectable()
export class KakaoProvider implements NotificationService {
  async send(to: string, subject: string, content: string): Promise<void> {
    // Implement Kakao messaging
    console.log(`Sending Kakao message to ${to}: ${content}`);
  }
}