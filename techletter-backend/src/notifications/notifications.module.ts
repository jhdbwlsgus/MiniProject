import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt'; // 👈 1. 이거 임포트!

import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { Notification } from './notification.entity';
import { NotificationPreference } from './notification-preference.entity';
import { ReporterProfile } from '../reporters/reporter-profile.entity';
import { ReporterSubscription } from '../reporters/reporter-subscription.entity';

@Module({
  imports: [
    // 기존에 있던 TypeOrm 엔티티들
    TypeOrmModule.forFeature([
      Notification, 
      NotificationPreference, 
      ReporterProfile, 
      ReporterSubscription
    ]),
    
    // 💡 2. 여기에 JwtModule 추가! (이제 컨트롤러에서 JwtService를 쓸 수 있습니다)
    JwtModule.register({}), // 만약 전역 설정이 안 되어 있다면 이렇게 빈 객체라도 넣어줍니다.
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}