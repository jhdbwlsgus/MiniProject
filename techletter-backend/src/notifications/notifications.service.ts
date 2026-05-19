import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Repository } from 'typeorm';
import { News, NewsStatus } from '../news/news.entity';
import { ReporterProfile, ReporterStatus } from '../reporters/reporter-profile.entity';
import { ReporterSubscription } from '../reporters/reporter-subscription.entity';
import { Notification, NotificationType } from './notification.entity';
import { NotificationPreference } from './notification-preference.entity';

export interface NotificationPreferenceDto {
  serviceTermsAgreed?: boolean;
  privacyAgreed?: boolean;
  marketingAgreed?: boolean;
  emailEnabled?: boolean;
  smsEnabled?: boolean;
  kakaoEnabled?: boolean;
  inAppEnabled?: boolean;
  newsletterEnabled?: boolean;
  reporterNewsEnabled?: boolean;
  activityEnabled?: boolean;
  subscriptionEnabled?: boolean;
  recommendationEnabled?: boolean;
}

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private notificationRepository: Repository<Notification>,
    @InjectRepository(NotificationPreference)
    private preferenceRepository: Repository<NotificationPreference>,
    @InjectRepository(ReporterProfile)
    private reporterProfileRepository: Repository<ReporterProfile>,
    @InjectRepository(ReporterSubscription)
    private reporterSubscriptionRepository: Repository<ReporterSubscription>,
  ) {}

  async ensurePreferences(userId: number, dto?: NotificationPreferenceDto) {
    let preference = await this.preferenceRepository.findOne({ where: { userId } });
    if (!preference) {
      const now = new Date();
      preference = this.preferenceRepository.create({
        userId,
        serviceTermsAgreed: dto?.serviceTermsAgreed ?? true,
        privacyAgreed: dto?.privacyAgreed ?? true,
        agreedAt: now,
        serviceTermsAgreedAt: dto?.serviceTermsAgreed === false ? null : now,
        privacyAgreedAt: dto?.privacyAgreed === false ? null : now,
      });
    }
    if (dto) {
      this.assignPreference(preference, dto);
    }
    return this.preferenceRepository.save(preference);
  }

  async getPreferences(userId: number) {
    return this.ensurePreferences(userId);
  }

  async updatePreferences(userId: number, dto: NotificationPreferenceDto) {
    if (dto.serviceTermsAgreed === false || dto.privacyAgreed === false) {
      throw new BadRequestException('Required terms must be agreed to use the service.');
    }
    const preference = await this.ensurePreferences(userId);
    this.assignPreference(preference, dto);
    return this.preferenceRepository.save(preference);
  }

  async list(userId: number, limit = 30) {
    return this.notificationRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: Math.min(limit, 100),
    });
  }

  async unreadCount(userId: number) {
    const count = await this.notificationRepository.count({ where: { userId, readAt: IsNull() } });
    return { count };
  }

  async markRead(userId: number, id: number) {
    await this.notificationRepository.update({ id, userId }, { readAt: new Date() });
    return { success: true };
  }

  async markAllRead(userId: number) {
    await this.notificationRepository
      .createQueryBuilder()
      .update(Notification)
      .set({ readAt: new Date() })
      .where('user_id = :userId', { userId })
      .andWhere('readAt IS NULL')
      .execute();
    return { success: true };
  }

  async createForUser(userId: number, payload: {
    type: NotificationType;
    title: string;
    message: string;
    linkUrl?: string | null;
    metadata?: Record<string, unknown> | null;
  }) {
    const preference = await this.ensurePreferences(userId);
    if (!this.shouldCreate(preference, payload.type)) return null;
    return this.notificationRepository.save(this.notificationRepository.create({
      userId,
      type: payload.type,
      title: payload.title,
      message: payload.message,
      linkUrl: payload.linkUrl || null,
      metadata: payload.metadata || null,
    }));
  }

  async notifyArticleComment(news: News, commenterId: number, commentContent: string) {
    if (!news.authorId || news.authorId === commenterId) return null;
    return this.createForUser(news.authorId, {
      type: NotificationType.COMMENT,
      title: '새 댓글이 달렸습니다',
      message: `"${news.title}" 기사에 댓글이 달렸습니다: ${commentContent.slice(0, 60)}`,
      linkUrl: `/news/${news.id}`,
      metadata: { newsId: news.id, actorId: commenterId },
    });
  }

  async notifyArticleLike(news: News, actorId: number) {
    if (!news.authorId || news.authorId === actorId) return null;
    return this.createForUser(news.authorId, {
      type: NotificationType.LIKE,
      title: '기사에 좋아요가 눌렸습니다',
      message: `"${news.title}" 기사에 새로운 반응이 생겼습니다.`,
      linkUrl: `/news/${news.id}`,
      metadata: { newsId: news.id, actorId },
    });
  }

  async notifyReporterArticle(news: News) {
    if (news.status !== NewsStatus.PUBLISHED || !news.authorId) return [];
    const profile = await this.reporterProfileRepository.findOne({
      where: { userId: news.authorId, status: ReporterStatus.APPROVED },
    });
    if (!profile) return [];

    const subscriptions = await this.reporterSubscriptionRepository.find({
      where: { reporterProfileId: profile.id },
    });
    const userIds = [...new Set(subscriptions.map((subscription) => subscription.userId))]
      .filter((userId) => userId !== news.authorId);
    if (!userIds.length) return [];

    const preferences = await this.preferenceRepository.find({ where: { userId: In(userIds) } });
    const preferenceByUserId = new Map(preferences.map((preference) => [preference.userId, preference]));
    const notifications = userIds
      .filter((userId) => this.shouldCreate(preferenceByUserId.get(userId), NotificationType.REPORTER_NEWS))
      .map((userId) => this.notificationRepository.create({
        userId,
        type: NotificationType.REPORTER_NEWS,
        title: `${profile.displayName} 기자의 새 기사`,
        message: news.title,
        linkUrl: `/news/${news.id}`,
        metadata: { newsId: news.id, reporterProfileId: profile.id },
      }));

    return notifications.length ? this.notificationRepository.save(notifications) : [];
  }

  private assignPreference(preference: NotificationPreference, dto: NotificationPreferenceDto) {
    const keys: Array<keyof NotificationPreferenceDto> = [
      'serviceTermsAgreed',
      'privacyAgreed',
      'marketingAgreed',
      'emailEnabled',
      'smsEnabled',
      'kakaoEnabled',
      'inAppEnabled',
      'newsletterEnabled',
      'reporterNewsEnabled',
      'activityEnabled',
      'subscriptionEnabled',
      'recommendationEnabled',
    ];
    for (const key of keys) {
      if (dto[key] !== undefined) {
        (preference as unknown as Record<string, boolean>)[key] = Boolean(dto[key]);
      }
    }
    if (!preference.agreedAt && preference.serviceTermsAgreed && preference.privacyAgreed) {
      preference.agreedAt = new Date();
    }
    this.touchAgreementDates(preference);
  }

  private touchAgreementDates(preference: NotificationPreference) {
    const now = new Date();
    if (preference.serviceTermsAgreed && !preference.serviceTermsAgreedAt) preference.serviceTermsAgreedAt = now;
    if (preference.privacyAgreed && !preference.privacyAgreedAt) preference.privacyAgreedAt = now;
    if (preference.marketingAgreed && !preference.marketingAgreedAt) preference.marketingAgreedAt = now;
    if (preference.emailEnabled && !preference.emailAgreedAt) preference.emailAgreedAt = now;
    if (preference.smsEnabled && !preference.smsAgreedAt) preference.smsAgreedAt = now;
    if (preference.kakaoEnabled && !preference.kakaoAgreedAt) preference.kakaoAgreedAt = now;
    if (preference.recommendationEnabled && !preference.recommendationAgreedAt) preference.recommendationAgreedAt = now;
  }

  private shouldCreate(preference: NotificationPreference | undefined, type: NotificationType) {
    if (preference && !preference.inAppEnabled) return false;
    if (!preference) return true;
    if (type === NotificationType.NEWSLETTER) return preference.newsletterEnabled;
    if (type === NotificationType.REPORTER_NEWS) return preference.reporterNewsEnabled;
    if (type === NotificationType.COMMENT || type === NotificationType.REPLY || type === NotificationType.LIKE) {
      return preference.activityEnabled;
    }
    if (type === NotificationType.SUBSCRIPTION) return preference.subscriptionEnabled;
    if (type === NotificationType.RECOMMENDATION) return preference.recommendationEnabled;
    if (type === NotificationType.ANNOUNCEMENT) return true;
    return true;
  }
}
