import {
  Controller,
  Get,
  Post,
  Delete,
  Put,
  Body,
  Param,
  Req,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PlanType, SubscriptionStatus } from './subscription.entity';

@Controller('subscriptions')
@UseGuards(JwtAuthGuard)
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  // 내 구독 정보 조회
  @Get('me')
  getMySubscription(@Req() req: any) {
    return this.subscriptionsService.getMySubscription(req.user.id);
  }

  // 구독 생성 (최초 구독 / 재구독)
  @Post()
  subscribe(
    @Req() req: any,
    @Body()
    body: {
      planType: PlanType;
      paymentMethodBrand: string;
      paymentMethodLast4: string;
    },
  ) {
    return this.subscriptionsService.subscribe(
      req.user.id,
      body.planType,
      body.paymentMethodBrand,
      body.paymentMethodLast4,
    );
  }

  // 구독 해지 (CANCELED)
  @Delete()
  cancelSubscription(@Req() req: any) {
    return this.subscriptionsService.cancelSubscription(req.user.id);
  }

  // 자동결제 재활성화
  @Post('reactivate')
  reactivateSubscription(@Req() req: any) {
    return this.subscriptionsService.reactivateSubscription(req.user.id);
  }

  // 결제 수단 변경
  @Put('payment-method')
  updatePaymentMethod(
    @Req() req: any,
    @Body() body: { brand: string; last4: string },
  ) {
    return this.subscriptionsService.updatePaymentMethod(
      req.user.id,
      body.brand,
      body.last4,
    );
  }

  // 결제 내역 조회
  @Get('payments')
  getMyPayments(@Req() req: any) {
    return this.subscriptionsService.getMyPayments(req.user.id);
  }

  // 구독 설정 변경 (기존 API 유지)
  @Put('me/settings')
  updateSettings(
    @Req() req: any,
    @Body() body: { dailyActive: boolean; weeklyActive: boolean },
  ) {
    return this.subscriptionsService.updateSettings(
      req.user.id,
      body.dailyActive,
      body.weeklyActive,
    );
  }

  // ✅ 관리자: 전체 구독자 목록 조회
  @Get('admin/all')
  async getAllSubscribers(@Req() req: any) {
    if (req.user.role !== 'admin') {
      throw new ForbiddenException('관리자만 접근 가능합니다.');
    }
    return this.subscriptionsService.getAllSubscribers();
  }

  @Put('admin/:id/status')
  async updateSubscriberStatus(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: { status: SubscriptionStatus },
  ) {
    if (req.user.role !== 'admin') {
      throw new ForbiddenException('관리자만 접근 가능합니다.');
    }
    return this.subscriptionsService.updateAdminStatus(Number(id), body.status);
  }

  @Put('admin/:id/settings')
  async updateSubscriberSettings(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: { dailyActive: boolean; weeklyActive: boolean },
  ) {
    if (req.user.role !== 'admin') {
      throw new ForbiddenException('관리자만 접근 가능합니다.');
    }
    return this.subscriptionsService.updateAdminSettings(
      Number(id),
      body.dailyActive,
      body.weeklyActive,
    );
  }

  @Put('admin/:id/plan')
  async updateSubscriberPlan(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: { planType: PlanType },
  ) {
    if (req.user.role !== 'admin') {
      throw new ForbiddenException('관리자만 접근 가능합니다.');
    }
    return this.subscriptionsService.updateAdminPlan(Number(id), body.planType);
  }

  @Put('admin/:id/memo')
  async updateSubscriberMemo(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: { adminMemo: string },
  ) {
    if (req.user.role !== 'admin') {
      throw new ForbiddenException('관리자만 접근 가능합니다.');
    }
    return this.subscriptionsService.updateAdminMemo(Number(id), body.adminMemo);
  }

  @Get('admin/:id/engagement')
  async getSubscriberEngagement(@Req() req: any, @Param('id') id: string) {
    if (req.user.role !== 'admin') {
      throw new ForbiddenException('관리자만 접근 가능합니다.');
    }
    return this.subscriptionsService.getAdminEngagement(Number(id));
  }
}
