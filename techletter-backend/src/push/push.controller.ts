import { Controller, Post, Body } from '@nestjs/common';
import { PushService } from './push.service';

@Controller('push')
export class PushController {
  constructor(private readonly pushService: PushService) {}

  @Post('subscribe')
  subscribe(@Body() subscription: any) {
    return this.pushService.subscribe(subscription);
  }

  @Post('send')
  send(@Body() data: any) {
    return this.pushService.sendNotification(data);
  }
}