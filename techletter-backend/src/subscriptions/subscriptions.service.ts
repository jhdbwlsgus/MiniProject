import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { PlanType, Subscription, SubscriptionStatus } from './subscription.entity';
import { Payment } from './payment.entity';
import { Bookmark } from '../interactions/entities/bookmark.entity';
import { Like } from '../interactions/entities/like.entity';
import { News } from '../news/news.entity';

export interface SubscriberEngagementItem {
  id: number;
  type: 'bookmark' | 'like';
  createdAt: Date;
  news: {
    id: number;
    title: string;
    categoryName: string | null;
    thumbnailUrl: string | null;
    publishedAt: Date | null;
  } | null;
}

export interface SubscriberEngagementSummary {
  bookmarkCount: number;
  likeCount: number;
  reactionScore: number;
  topCategories: Array<{ name: string; count: number }>;
  topTags: Array<{ name: string; count: number }>;
  recentActivity: SubscriberEngagementItem[];
}

@Injectable()
export class SubscriptionsService {
  constructor(
    @InjectRepository(Subscription)
    private subscriptionRepo: Repository<Subscription>,
    @InjectRepository(Payment)
    private paymentRepo: Repository<Payment>,
    @InjectRepository(Bookmark)
    private bookmarkRepository: Repository<Bookmark>,
    @InjectRepository(Like)
    private likeRepository: Repository<Like>,
    @InjectRepository(News)
    private newsRepository: Repository<News>,
  ) {}

  // 내 구독 정보 조회
  async getMySubscription(userId: number): Promise<Subscription | null> {
    return this.subscriptionRepo.findOne({ where: { userId } });
  }

  // 구독 생성 (최초 구독)
  async subscribe(
    userId: number,
    planType: PlanType,
    paymentMethodBrand: string,
    paymentMethodLast4: string,
  ): Promise<Subscription> {
    if (!this.isSupportedPlan(planType)) {
      throw new BadRequestException('지원하지 않는 구독 플랜입니다.');
    }
    const existing = await this.subscriptionRepo.findOne({ where: { userId } });
    if (existing && existing.status === 'ACTIVE') {
      throw new BadRequestException('이미 구독 중입니다.');
    }

    const today = new Date();
    const endDate = new Date(today);
    endDate.setMonth(endDate.getMonth() + 1);
    endDate.setDate(endDate.getDate() - 1);

    const nextPaymentDate = new Date(today);
    nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 1);

    const formatDate = (d: Date) => d.toISOString().split('T')[0];

    if (existing) {
      existing.status = 'ACTIVE';
      existing.planType = planType;
      existing.startDate = formatDate(today);
      existing.endDate = formatDate(endDate);
      existing.nextPaymentDate = formatDate(nextPaymentDate);
      existing.billingCycle = 'monthly';
      existing.autoRenew = true;
      existing.cancelAtPeriodEnd = false;
      existing.paymentMethodBrand = paymentMethodBrand;
      existing.paymentMethodLast4 = paymentMethodLast4;
      existing.dailyActive = planType === 'daily' || planType === 'all' || planType === 'premium';
      existing.weeklyActive = planType === 'weekly' || planType === 'all' || planType === 'premium';
      await this.subscriptionRepo.save(existing);
      await this.createPaymentRecord(existing, today);
      return existing;
    }

    const subscription = this.subscriptionRepo.create({
      userId,
      status: 'ACTIVE',
      planType,
      startDate: formatDate(today),
      endDate: formatDate(endDate),
      nextPaymentDate: formatDate(nextPaymentDate),
      billingCycle: 'monthly',
      autoRenew: true,
      cancelAtPeriodEnd: false,
      paymentMethodBrand,
      paymentMethodLast4,
      dailyActive: planType === 'daily' || planType === 'all' || planType === 'premium',
      weeklyActive: planType === 'weekly' || planType === 'all' || planType === 'premium',
    });

    await this.subscriptionRepo.save(subscription);
    await this.createPaymentRecord(subscription, today);
    return subscription;
  }

  // 결제 내역 생성 (내부 사용)
  private async createPaymentRecord(subscription: Subscription, paidAt: Date): Promise<Payment> {
    const planPrices: Record<string, number> = {
      daily: 2900,
      weekly: 1900,
      all: 3900,
      premium: 9900,
    };

    const payment = this.paymentRepo.create({
      userId: subscription.userId,
      subscriptionId: subscription.id,
      amount: planPrices[subscription.planType ?? 'all'],
      status: 'SUCCESS',
      periodStart: subscription.startDate!,
      periodEnd: subscription.endDate!,
      paymentMethodBrand: subscription.paymentMethodBrand,
      paymentMethodLast4: subscription.paymentMethodLast4,
      planType: subscription.planType,
      paidAt,
    });

    return this.paymentRepo.save(payment);
  }

  // 구독 해지 (CANCELED - 기간 만료까지 유지)
  async cancelSubscription(userId: number): Promise<Subscription> {
    const subscription = await this.subscriptionRepo.findOne({ where: { userId } });
    if (!subscription || subscription.status !== 'ACTIVE') {
      throw new BadRequestException('구독 중인 서비스가 없습니다.');
    }
    subscription.status = 'CANCELED';
    subscription.autoRenew = false;
    subscription.cancelAtPeriodEnd = true;
    return this.subscriptionRepo.save(subscription);
  }

  // 자동결제 재활성화 (CANCELED → ACTIVE)
  async reactivateSubscription(userId: number): Promise<Subscription> {
    const subscription = await this.subscriptionRepo.findOne({ where: { userId } });
    if (!subscription || subscription.status !== 'CANCELED') {
      throw new BadRequestException('재활성화할 구독이 없습니다.');
    }

    subscription.status = 'ACTIVE';
    subscription.autoRenew = true;
    subscription.cancelAtPeriodEnd = false;

    const today = new Date();
    const endDate = new Date(subscription.endDate!);
    if (endDate > today) {
      const nextPayment = new Date(endDate);
      nextPayment.setDate(nextPayment.getDate() + 1);
      subscription.nextPaymentDate = nextPayment.toISOString().split('T')[0];
    } else {
      const newEnd = new Date(today);
      newEnd.setMonth(newEnd.getMonth() + 1);
      newEnd.setDate(newEnd.getDate() - 1);
      const nextPayment = new Date(today);
      nextPayment.setMonth(nextPayment.getMonth() + 1);

      subscription.startDate = today.toISOString().split('T')[0];
      subscription.endDate = newEnd.toISOString().split('T')[0];
      subscription.nextPaymentDate = nextPayment.toISOString().split('T')[0];
    }

    return this.subscriptionRepo.save(subscription);
  }

  // 결제 수단 변경
  async updatePaymentMethod(
    userId: number,
    brand: string,
    last4: string,
  ): Promise<Subscription> {
    const subscription = await this.subscriptionRepo.findOne({ where: { userId } });
    if (!subscription) throw new NotFoundException('구독 정보가 없습니다.');

    subscription.paymentMethodBrand = brand;
    subscription.paymentMethodLast4 = last4;

    if (subscription.status === 'PAYMENT_FAILED') {
      subscription.status = 'ACTIVE';
    }

    return this.subscriptionRepo.save(subscription);
  }

  // 내 결제 내역 조회
  async getMyPayments(userId: number): Promise<Payment[]> {
    return this.paymentRepo.find({
      where: { userId },
      order: { paidAt: 'DESC' },
    });
  }

  // 만료된 구독 처리 스케줄러용
  async expireSubscriptions(): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    await this.subscriptionRepo
      .createQueryBuilder()
      .update(Subscription)
      .set({ status: 'EXPIRED' })
      .where('status = :status', { status: 'CANCELED' })
      .andWhere('endDate < :today', { today })
      .execute();
  }

  // 구독 설정 변경 (기존 API 유지)
  async updateSettings(
    userId: number,
    dailyActive: boolean,
    weeklyActive: boolean,
  ): Promise<Subscription> {
    const subscription = await this.subscriptionRepo.findOne({ where: { userId } });
    if (!subscription) throw new NotFoundException('구독 정보가 없습니다.');

    subscription.dailyActive = dailyActive;
    subscription.weeklyActive = weeklyActive;
    return this.subscriptionRepo.save(subscription);
  }

  // ✅ 관리자: 전체 구독자 목록 조회
  async getAllSubscribers(): Promise<Subscription[]> {
    return this.subscriptionRepo.find({
      where: [
        { status: 'ACTIVE' },
        { status: 'CANCELED' },
        { status: 'EXPIRED' },
        { status: 'PAYMENT_FAILED' },
      ],
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });
  }

  async updateAdminStatus(
    subscriptionId: number,
    status: SubscriptionStatus,
  ): Promise<Subscription> {
    if (!['ACTIVE', 'CANCELED', 'EXPIRED', 'PAYMENT_FAILED'].includes(status)) {
      throw new BadRequestException('변경할 수 없는 구독 상태입니다.');
    }

    const subscription = await this.subscriptionRepo.findOne({
      where: { id: subscriptionId },
      relations: ['user'],
    });
    if (!subscription) throw new NotFoundException('구독 정보를 찾을 수 없습니다.');

    subscription.status = status;

    if (status === 'ACTIVE') {
      const today = new Date();
      const currentEndDate = subscription.endDate ? new Date(subscription.endDate) : null;

      if (!subscription.startDate || !currentEndDate || currentEndDate < today) {
        const endDate = new Date(today);
        endDate.setMonth(endDate.getMonth() + 1);
        endDate.setDate(endDate.getDate() - 1);

        const nextPaymentDate = new Date(today);
        nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 1);

        subscription.startDate = today.toISOString().split('T')[0];
        subscription.endDate = endDate.toISOString().split('T')[0];
        subscription.nextPaymentDate = nextPaymentDate.toISOString().split('T')[0];
      }
    }

    return this.subscriptionRepo.save(subscription);
  }

  async updateAdminSettings(
    subscriptionId: number,
    dailyActive: boolean,
    weeklyActive: boolean,
  ): Promise<Subscription> {
    const subscription = await this.subscriptionRepo.findOne({
      where: { id: subscriptionId },
      relations: ['user'],
    });
    if (!subscription) throw new NotFoundException('구독 정보를 찾을 수 없습니다.');

    subscription.dailyActive = dailyActive;
    subscription.weeklyActive = weeklyActive;
    return this.subscriptionRepo.save(subscription);
  }

  async updateAdminPlan(subscriptionId: number, planType: PlanType): Promise<Subscription> {
    if (!this.isSupportedPlan(planType)) {
      throw new BadRequestException('변경할 수 없는 구독 플랜입니다.');
    }

    const subscription = await this.subscriptionRepo.findOne({
      where: { id: subscriptionId },
      relations: ['user'],
    });
    if (!subscription) throw new NotFoundException('구독 정보를 찾을 수 없습니다.');

    subscription.planType = planType;
    subscription.dailyActive = planType === 'daily' || planType === 'all' || planType === 'premium';
    subscription.weeklyActive = planType === 'weekly' || planType === 'all' || planType === 'premium';
    return this.subscriptionRepo.save(subscription);
  }

  private isSupportedPlan(planType: PlanType): boolean {
    return ['daily', 'weekly', 'all', 'premium'].includes(planType);
  }

  async updateAdminMemo(subscriptionId: number, adminMemo: string): Promise<Subscription> {
    const subscription = await this.subscriptionRepo.findOne({
      where: { id: subscriptionId },
      relations: ['user'],
    });
    if (!subscription) throw new NotFoundException('구독 정보를 찾을 수 없습니다.');

    subscription.adminMemo = adminMemo?.trim() || null;
    return this.subscriptionRepo.save(subscription);
  }

  async getAdminEngagement(subscriptionId: number): Promise<SubscriberEngagementSummary> {
    const subscription = await this.subscriptionRepo.findOne({
      where: { id: subscriptionId },
    });
    if (!subscription) throw new NotFoundException('구독 정보를 찾을 수 없습니다.');

    const [bookmarks, likes] = await Promise.all([
      this.bookmarkRepository.find({
        where: { userId: subscription.userId },
        relations: ['news', 'news.category', 'news.tags'],
        order: { createdAt: 'DESC' },
      }),
      this.likeRepository.find({
        where: { userId: subscription.userId },
        relations: ['news', 'news.category', 'news.tags'],
        order: { createdAt: 'DESC' },
      }),
    ]);

    const categoryMap = new Map<string, number>();
    const tagMap = new Map<string, number>();

    const addNewsSignals = (news: News | null | undefined, weight: number) => {
      if (!news) return;
      if (news.category?.name) {
        categoryMap.set(news.category.name, (categoryMap.get(news.category.name) ?? 0) + weight);
      }
      for (const tag of news.tags ?? []) {
        if (tag.name) tagMap.set(tag.name, (tagMap.get(tag.name) ?? 0) + weight);
      }
    };

    bookmarks.forEach((bookmark) => addNewsSignals(bookmark.news, 2));
    likes.forEach((like) => addNewsSignals(like.news, 1));

    const toSortedList = (map: Map<string, number>) =>
      [...map.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, count]) => ({ name, count }));

    const recentActivity: SubscriberEngagementItem[] = [
      ...bookmarks.map((bookmark) => ({
        id: bookmark.id,
        type: 'bookmark' as const,
        createdAt: bookmark.createdAt,
        news: bookmark.news
          ? {
              id: bookmark.news.id,
              title: bookmark.news.title,
              categoryName: bookmark.news.category?.name ?? null,
              thumbnailUrl: bookmark.news.thumbnailUrl ?? null,
              publishedAt: bookmark.news.publishedAt ?? null,
            }
          : null,
      })),
      ...likes.map((like) => ({
        id: like.id,
        type: 'like' as const,
        createdAt: like.createdAt,
        news: like.news
          ? {
              id: like.news.id,
              title: like.news.title,
              categoryName: like.news.category?.name ?? null,
              thumbnailUrl: like.news.thumbnailUrl ?? null,
              publishedAt: like.news.publishedAt ?? null,
            }
          : null,
      })),
    ]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 8);

    return {
      bookmarkCount: bookmarks.length,
      likeCount: likes.length,
      reactionScore: bookmarks.length * 2 + likes.length,
      topCategories: toSortedList(categoryMap),
      topTags: toSortedList(tagMap),
      recentActivity,
    };
  }
}
