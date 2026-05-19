import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { News, NewsStatus } from '../news/news.entity';
import { NotificationType } from '../notifications/notification.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { User, UserRole } from '../users/user.entity';
import { ReporterFeed, ReporterFeedType } from './reporter-feed.entity';
import { ReporterProfile, ReporterStatus } from './reporter-profile.entity';
import { ReporterSubscription } from './reporter-subscription.entity';

interface ReporterProfileDto {
  displayName?: string;
  headline?: string;
  bio?: string;
  profileImage?: string;
  coverImage?: string;
  subscriptionPitch?: string;
  specialties?: string[];
  categoryIds?: number[];
  portfolioUrl?: string;
  blogUrl?: string;
  plannedTopics?: string[];
  featuredNewsIds?: number[];
  githubUrl?: string;
  previousExperience?: string;
  sampleArticleType?: string;
  sampleArticleText?: string;
  sampleArticleUrl?: string;
  sampleArticleFileUrl?: string;
}

@Injectable()
export class ReportersService {
  constructor(
    @InjectRepository(ReporterProfile)
    private reporterProfileRepository: Repository<ReporterProfile>,
    @InjectRepository(ReporterFeed)
    private reporterFeedRepository: Repository<ReporterFeed>,
    @InjectRepository(ReporterSubscription)
    private reporterSubscriptionRepository: Repository<ReporterSubscription>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(News)
    private newsRepository: Repository<News>,
    private notificationsService: NotificationsService,
  ) {}

  async listApproved() {
    const reporters = await this.reporterProfileRepository.find({
      where: { status: ReporterStatus.APPROVED },
      relations: ['user'],
      order: { approvedAt: 'DESC', createdAt: 'DESC' },
      take: 50,
    });

    return Promise.all(reporters.map((reporter) => this.withPublicCounts(reporter)));
  }

  async getPublicProfile(slug: string) {
    const reporter = await this.reporterProfileRepository.findOne({
      where: { slug, status: ReporterStatus.APPROVED },
      relations: ['user'],
    });
    if (!reporter) throw new NotFoundException('Reporter profile not found.');

    reporter.profileViewCount = (reporter.profileViewCount || 0) + 1;
    await this.reporterProfileRepository.save(reporter);

    const featuredIds = (reporter.featuredNewsIds || []).slice(0, 3);
    const [news, feeds, subscriberCount, newsCount, featuredNews] = await Promise.all([
      this.newsRepository.find({
        where: { authorId: reporter.userId, status: NewsStatus.PUBLISHED },
        relations: ['category', 'tags'],
        order: { publishedAt: 'DESC', createdAt: 'DESC' },
        take: 12,
      }),
      this.reporterFeedRepository.find({
        where: { reporterProfileId: reporter.id, published: true },
        order: { createdAt: 'DESC' },
        take: 10,
      }),
      this.reporterSubscriptionRepository.count({ where: { reporterProfileId: reporter.id } }),
      this.newsRepository.count({ where: { authorId: reporter.userId, status: NewsStatus.PUBLISHED } }),
      featuredIds.length
        ? this.newsRepository.find({
            where: { id: In(featuredIds), authorId: reporter.userId, status: NewsStatus.PUBLISHED },
            relations: ['category', 'tags'],
          })
        : Promise.resolve([]),
    ]);
    const featuredById = new Map(featuredNews.map((item) => [item.id, item]));

    return {
      ...this.toPublicReporter(reporter),
      subscriberCount,
      newsCount,
      conversionRate: this.getConversionRate(subscriberCount, reporter.profileViewCount),
      featuredNews: featuredIds.map((id) => featuredById.get(id)).filter(Boolean),
      news,
      feeds,
    };
  }

  async getPublicProfileByUser(userId: number) {
    const reporter = await this.reporterProfileRepository.findOne({
      where: { userId, status: ReporterStatus.APPROVED },
      relations: ['user'],
    });
    if (!reporter) throw new NotFoundException('Reporter profile not found.');
    return this.withPublicCounts(reporter);
  }

  async getMine(userId: number) {
    return this.reporterProfileRepository.findOne({
      where: { userId },
      relations: ['user'],
    });
  }

  async apply(userId: number, dto: ReporterProfileDto) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found.');
    if (user.role === UserRole.ADMIN) {
      throw new BadRequestException('Admins cannot apply for reporter membership.');
    }

    const displayName = dto.displayName?.trim() || user.nickname;
    let profile = await this.reporterProfileRepository.findOne({ where: { userId } });
    const baseSlug = this.slugify(displayName || user.email.split('@')[0]);
    const slug = profile?.slug || await this.createUniqueSlug(baseSlug);

    if (!profile) {
      profile = this.reporterProfileRepository.create({ userId, slug });
    }

    profile.displayName = displayName;
    profile.headline = dto.headline?.trim() || null;
    profile.bio = dto.bio?.trim() || user.bio || null;
    profile.profileImage = dto.profileImage?.trim() || user.profileImage || null;
    profile.coverImage = dto.coverImage?.trim() || null;
    profile.subscriptionPitch = dto.subscriptionPitch?.trim() || null;
    profile.specialties = dto.specialties?.filter(Boolean).map((item) => item.trim()) || [];
    profile.categoryIds = dto.categoryIds || user.interestCategoryIds || [];
    profile.portfolioUrl = dto.portfolioUrl?.trim() || null;
    profile.blogUrl = dto.blogUrl?.trim() || null;
    profile.plannedTopics = dto.plannedTopics?.filter(Boolean).map((item) => item.trim()) || [];
    profile.featuredNewsIds = (dto.featuredNewsIds || []).slice(0, 3);
    profile.githubUrl = dto.githubUrl?.trim() || null;
    profile.previousExperience = dto.previousExperience?.trim() || null;
    profile.sampleArticleType = dto.sampleArticleType?.trim() || null;
    profile.sampleArticleText = dto.sampleArticleText?.trim() || null;
    profile.sampleArticleUrl = dto.sampleArticleUrl?.trim() || null;
    profile.sampleArticleFileUrl = dto.sampleArticleFileUrl?.trim() || null;
    profile.reviewMessage = null;
    profile.reviewedAt = null;
    profile.reviewedById = null;
    if (profile.status !== ReporterStatus.APPROVED) {
      profile.status = ReporterStatus.PENDING;
    }

    return this.reporterProfileRepository.save(profile);
  }

  async listForAdmin(status?: ReporterStatus) {
    const where = status ? { status } : {};
    const profiles = await this.reporterProfileRepository.find({
      where,
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });
    return profiles.filter((profile) => profile.user?.role !== UserRole.ADMIN);
  }

  async updateStatus(adminRole: string, adminId: number, profileId: number, status: ReporterStatus, reviewMessage?: string) {
    this.ensureAdmin(adminRole);
    if (!Object.values(ReporterStatus).includes(status)) {
      throw new BadRequestException('Invalid reporter status.');
    }

    const profile = await this.reporterProfileRepository.findOne({
      where: { id: profileId },
      relations: ['user'],
    });
    if (!profile) throw new NotFoundException('Reporter profile not found.');
    const targetUser = profile.user || await this.userRepository.findOne({ where: { id: profile.userId } });
    if (!targetUser) throw new NotFoundException('Reporter applicant user not found.');
    if (targetUser.role === UserRole.ADMIN) {
      throw new BadRequestException('관리자는 기자 승인 대상이 아닙니다.');
    }

    profile.status = status;
    profile.approvedAt = status === ReporterStatus.APPROVED ? new Date() : null;
    profile.reviewMessage = reviewMessage?.trim() || null;
    profile.reviewedAt = new Date();
    profile.reviewedById = adminId;
    if (status === ReporterStatus.APPROVED && !profile.level) profile.level = 1;
    await this.reporterProfileRepository.save(profile);

    if (status === ReporterStatus.APPROVED) {
      targetUser.role = UserRole.REPORTER;
    } else if (targetUser.role === UserRole.REPORTER) {
      targetUser.role = UserRole.USER;
    }
    await this.userRepository.save(targetUser);
    profile.user = targetUser;

    await this.notificationsService.createForUser(profile.userId, {
      type: NotificationType.ANNOUNCEMENT,
      title: this.getStatusNotificationTitle(status),
      message: this.getStatusNotificationMessage(status, profile.reviewMessage),
      linkUrl: '/mypage/profile',
      metadata: { reporterProfileId: profile.id, reporterStatus: status },
    });

    return profile;
  }

  async getDashboard(userId: number, role: string) {
    const profile = await this.requireReporterProfile(userId, role);
    const [news, feedCount, subscriberCount, publishedCount, draftCount] = await Promise.all([
      this.newsRepository.find({
        where: { authorId: userId },
        relations: ['category'],
        order: { createdAt: 'DESC' },
        take: 8,
      }),
      this.reporterFeedRepository.count({ where: { reporterProfileId: profile.id } }),
      this.reporterSubscriptionRepository.count({ where: { reporterProfileId: profile.id } }),
      this.newsRepository.count({ where: { authorId: userId, status: NewsStatus.PUBLISHED } }),
      this.newsRepository.count({ where: { authorId: userId, status: NewsStatus.DRAFT } }),
    ]);
    const totalViews = news.reduce((sum, item) => sum + (item.viewCount || 0), 0);
    const totalLikes = news.reduce((sum, item) => sum + (item.likeCount || 0), 0);

    return {
      profile,
      stats: {
        subscriberCount,
        feedCount,
        publishedCount,
        draftCount,
        totalViews,
        totalLikes,
        profileViewCount: profile.profileViewCount || 0,
        conversionRate: this.getConversionRate(subscriberCount, profile.profileViewCount || 0),
      },
      news,
    };
  }

  async listMySubscribers(userId: number, role: string) {
    const profile = await this.requireReporterProfile(userId, role);
    const subscriptions = await this.reporterSubscriptionRepository.find({
      where: { reporterProfileId: profile.id },
      order: { createdAt: 'DESC' },
    });
    const userIds = subscriptions.map((subscription) => subscription.userId);
    const users = userIds.length ? await this.userRepository.findByIds(userIds) : [];
    const userById = new Map(users.map((user) => [user.id, user]));

    return subscriptions.map((subscription) => {
      const subscriber = userById.get(subscription.userId);
      return {
        id: subscription.id,
        createdAt: subscription.createdAt,
        user: subscriber ? {
          id: subscriber.id,
          email: subscriber.email,
          nickname: subscriber.nickname,
          profileImage: subscriber.profileImage,
          createdAt: subscriber.createdAt,
        } : null,
      };
    });
  }

  async updateMyProfile(userId: number, role: string, dto: ReporterProfileDto) {
    const profile = await this.requireReporterProfile(userId, role);
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found.');

    const displayName = dto.displayName?.trim();
    if (!displayName) throw new BadRequestException('Display name is required.');

    profile.displayName = displayName;
    profile.headline = dto.headline?.trim() || null;
    profile.bio = dto.bio?.trim() || null;
    profile.profileImage = dto.profileImage?.trim() || null;
    profile.coverImage = dto.coverImage?.trim() || null;
    profile.subscriptionPitch = dto.subscriptionPitch?.trim() || null;
    profile.specialties = dto.specialties?.filter(Boolean).map((item) => item.trim()) || [];
    profile.categoryIds = dto.categoryIds || [];
    profile.portfolioUrl = dto.portfolioUrl?.trim() || null;
    profile.blogUrl = dto.blogUrl?.trim() || null;
    profile.githubUrl = dto.githubUrl?.trim() || null;
    profile.featuredNewsIds = (dto.featuredNewsIds || []).slice(0, 3);

    user.nickname = displayName;
    user.bio = profile.bio;
    user.profileImage = profile.profileImage || '';
    user.interestCategoryIds = profile.categoryIds;

    await this.userRepository.save(user);
    const saved = await this.reporterProfileRepository.save(profile);
    saved.user = user;
    return saved;
  }

  async listMyFeeds(userId: number, role: string) {
    const profile = await this.requireReporterProfile(userId, role);
    return this.reporterFeedRepository.find({
      where: { reporterProfileId: profile.id },
      order: { createdAt: 'DESC' },
    });
  }

  async createFeed(userId: number, role: string, dto: {
    type?: ReporterFeedType;
    title?: string;
    content?: string;
    linkUrl?: string;
    published?: boolean;
  }) {
    const profile = await this.requireReporterProfile(userId, role);
    if (!dto.content?.trim()) throw new BadRequestException('Feed content is required.');
    const feed = this.reporterFeedRepository.create({
      reporterProfileId: profile.id,
      type: dto.type || ReporterFeedType.COMMENT,
      title: dto.title?.trim() || null,
      content: dto.content.trim(),
      linkUrl: dto.linkUrl?.trim() || null,
      published: dto.published ?? true,
    });
    return this.reporterFeedRepository.save(feed);
  }

  async subscribe(userId: number, reporterProfileId: number) {
    const profile = await this.reporterProfileRepository.findOne({
      where: { id: reporterProfileId, status: ReporterStatus.APPROVED },
    });
    if (!profile) throw new NotFoundException('Reporter profile not found.');
    if (profile.userId === userId) throw new BadRequestException('You cannot subscribe to yourself.');

    const existing = await this.reporterSubscriptionRepository.findOne({
      where: { userId, reporterProfileId },
    });
    if (existing) return existing;

    return this.reporterSubscriptionRepository.save(
      this.reporterSubscriptionRepository.create({ userId, reporterProfileId }),
    );
  }

  async unsubscribe(userId: number, reporterProfileId: number) {
    await this.reporterSubscriptionRepository.delete({ userId, reporterProfileId });
    return { success: true };
  }

  private async withPublicCounts(reporter: ReporterProfile) {
    const [subscriberCount, newsCount] = await Promise.all([
      this.reporterSubscriptionRepository.count({ where: { reporterProfileId: reporter.id } }),
      this.newsRepository.count({ where: { authorId: reporter.userId, status: NewsStatus.PUBLISHED } }),
    ]);
    return { ...this.toPublicReporter(reporter), subscriberCount, newsCount };
  }

  private toPublicReporter(reporter: ReporterProfile) {
    return {
      id: reporter.id,
      userId: reporter.userId,
      slug: reporter.slug,
      displayName: reporter.displayName,
      headline: reporter.headline,
      bio: reporter.bio,
      profileImage: reporter.profileImage,
      coverImage: reporter.coverImage,
      subscriptionPitch: reporter.subscriptionPitch,
      specialties: reporter.specialties || [],
      categoryIds: reporter.categoryIds || [],
      portfolioUrl: reporter.portfolioUrl,
      blogUrl: reporter.blogUrl,
      githubUrl: reporter.githubUrl,
      featuredNewsIds: reporter.featuredNewsIds || [],
      profileViewCount: reporter.profileViewCount || 0,
      level: reporter.level,
      approvedAt: reporter.approvedAt,
      user: reporter.user ? {
        id: reporter.user.id,
        nickname: reporter.user.nickname,
        profileImage: reporter.user.profileImage,
      } : undefined,
    };
  }

  private async requireReporterProfile(userId: number, role: string) {
    if (role !== UserRole.REPORTER && role !== UserRole.ADMIN) {
      throw new ForbiddenException('Reporter permission is required.');
    }
    const profile = await this.reporterProfileRepository.findOne({ where: { userId } });
    if (!profile || profile.status !== ReporterStatus.APPROVED) {
      throw new ForbiddenException('Approved reporter profile is required.');
    }
    return profile;
  }

  private ensureAdmin(role: string) {
    if (role !== UserRole.ADMIN) throw new ForbiddenException('Admin permission is required.');
  }

  private getConversionRate(subscriberCount: number, profileViewCount: number) {
    if (!profileViewCount) return 0;
    return Math.round((subscriberCount / profileViewCount) * 1000) / 10;
  }

  private async createUniqueSlug(baseSlug: string) {
    let slug = baseSlug || 'reporter';
    let suffix = 1;
    while (await this.reporterProfileRepository.findOne({ where: { slug } })) {
      suffix += 1;
      slug = `${baseSlug}-${suffix}`;
    }
    return slug;
  }

  private slugify(value: string) {
    return value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9가-힣]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60);
  }

  private getStatusNotificationTitle(status: ReporterStatus) {
    if (status === ReporterStatus.APPROVED) return '기자 신청이 승인되었습니다';
    if (status === ReporterStatus.REJECTED) return '기자 신청이 반려되었습니다';
    if (status === ReporterStatus.MORE_INFO_REQUIRED) return '기자 신청에 추가 정보가 필요합니다';
    if (status === ReporterStatus.SUSPENDED) return '기자 권한이 정지되었습니다';
    return '기자 신청이 접수되었습니다';
  }

  private getStatusNotificationMessage(status: ReporterStatus, reviewMessage: string | null) {
    const suffix = reviewMessage ? ` 사유: ${reviewMessage}` : '';
    if (status === ReporterStatus.APPROVED) return `이제 기사 작성, 기자 피드, 개인 통계를 사용할 수 있습니다.${suffix}`;
    if (status === ReporterStatus.REJECTED) return `관리자 심사 결과 기자 신청이 반려되었습니다.${suffix}`;
    if (status === ReporterStatus.MORE_INFO_REQUIRED) return `관리자가 추가 정보를 요청했습니다. 기자 신청 페이지에서 보완 후 다시 제출해주세요.${suffix}`;
    if (status === ReporterStatus.SUSPENDED) return `기자 권한이 일시 정지되었습니다.${suffix}`;
    return `기자 신청이 접수되어 관리자 심사를 기다리고 있습니다.${suffix}`;
  }
}
