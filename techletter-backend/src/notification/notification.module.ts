import { Module } from '@nestjs/common';
import { NotificationService } from './notification.interface';
import { EmailProvider } from './providers/email.provider';
import { KakaoProvider } from './providers/kakao.provider';

@Module({
  providers: [
    {
      provide: 'NotificationService',
      useClass: EmailProvider,
    },
    EmailProvider,
    KakaoProvider,
  ],
  exports: ['NotificationService'],
})
export class NotificationModule {}