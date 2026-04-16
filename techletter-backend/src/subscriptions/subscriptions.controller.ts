import { Controller, Get, Post, Delete, Param } from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';

@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Post(':userId')
  create(@Param('userId') userId: string) {
    return this.subscriptionsService.create(+userId);
  }

  @Get()
  findAll() {
    return this.subscriptionsService.findAll();
  }

  @Delete(':userId')
  remove(@Param('userId') userId: string) {
    return this.subscriptionsService.remove(+userId);
  }
}