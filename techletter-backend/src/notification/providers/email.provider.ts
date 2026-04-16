import { Injectable } from '@nestjs/common';
import { NotificationService } from '../notification.interface';

@Injectable()
export class EmailProvider implements NotificationService {
  async send(to: string, subject: string, content: string): Promise<void> {
    // Implement email sending using Resend
    console.log(`Sending email to ${to}: ${subject}`);
  }
}