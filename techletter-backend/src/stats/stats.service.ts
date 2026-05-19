import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { News, NewsStatus } from '../news/news.entity';
import { User } from '../users/user.entity';
import { Like } from '../interactions/entities/like.entity';
import { Comment } from '../interactions/entities/comment.entity';
import { Subscription } from '../subscriptions/subscription.entity';
import { NewsletterSend } from '../newsletter/newsletter.entity';
import { NewsView } from '../news/news-view.entity';

@Injectable()
export class StatsService {
  constructor(
    @InjectRepository(News)
    private newsRepository: Repository<News>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Like)
    private likeRepository: Repository<Like>,
    @InjectRepository(Comment)
    private commentRepository: Repository<Comment>,
    @InjectRepository(Subscription)
    private subscriptionRepository: Repository<Subscription>,
    @InjectRepository(NewsletterSend)
    private newsletterRepository: Repository<NewsletterSend>,
    @InjectRepository(NewsView)
    private newsViewRepository: Repository<NewsView>,
  ) {}

  async getDashboard() {
    const [
      totalUsers,
      totalSubscribers,
      activeSubscribers,
      canceledSubscribers,
      failedSubscribers,
      totalNews,
      draftNews,
      scheduledNews,
      todayPublishedNews,
      aiNews,
      totalComments,
      totalLikes,
      viewsRaw,
      todayViews,
      topNews,
      recentNews,
      newsletterRaw,
      pendingNewsletter,
    ] = await Promise.all([
      this.userRepository.count(),
      this.subscriptionRepository.count(),
      this.subscriptionRepository.count({ where: { status: 'ACTIVE' } }),
      this.subscriptionRepository.count({ where: { status: 'CANCELED' } }),
      this.subscriptionRepository.count({ where: { status: 'PAYMENT_FAILED' } }),
      this.newsRepository.count({ where: { status: NewsStatus.PUBLISHED } }),
      this.newsRepository.count({ where: { status: NewsStatus.DRAFT } }),
      this.newsRepository.count({ where: { status: NewsStatus.SCHEDULED } }),
      this.newsRepository
        .createQueryBuilder('news')
        .where('news.status = :status', { status: NewsStatus.PUBLISHED })
        .andWhere('DATE(COALESCE(news.publishedAt, news.createdAt)) = CURDATE()')
        .getCount(),
      this.newsRepository
        .createQueryBuilder('news')
        .where('news.status = :status', { status: NewsStatus.PUBLISHED })
        .andWhere('news.aiSummary IS NOT NULL')
        .andWhere('news.aiSummary != :empty', { empty: '' })
        .getCount(),
      this.commentRepository.count(),
      this.likeRepository.count(),
      this.newsRepository
        .createQueryBuilder('news')
        .select('COALESCE(SUM(news.viewCount), 0)', 'totalViews')
        .addSelect('COALESCE(AVG(news.viewCount), 0)', 'averageViews')
        .where('news.status = :status', { status: NewsStatus.PUBLISHED })
        .getRawOne<{ totalViews: string; averageViews: string }>(),
      this.newsViewRepository
        .createQueryBuilder('view')
        .where('DATE(view.createdAt) = CURDATE()')
        .getCount(),
      this.newsRepository.find({
        where: { status: NewsStatus.PUBLISHED },
        order: { viewCount: 'DESC' },
        take: 5,
        relations: ['author', 'category'],
      }),
      this.newsRepository.find({
        where: { status: NewsStatus.PUBLISHED },
        order: { publishedAt: 'DESC', createdAt: 'DESC' },
        take: 5,
        relations: ['author', 'category'],
      }),
      this.newsletterRepository
        .createQueryBuilder('send')
        .select('COALESCE(SUM(send.recipientCount), 0)', 'recipients')
        .addSelect('COALESCE(SUM(send.successCount), 0)', 'success')
        .addSelect('COALESCE(SUM(send.failCount), 0)', 'failed')
        .where('send.status IN (:...statuses)', { statuses: ['SUCCESS', 'FAILED'] })
        .getRawOne<{ recipients: string; success: string; failed: string }>(),
      this.newsletterRepository.count({ where: { status: 'SCHEDULED' } }),
    ]);

    const [dailySubscribers, weeklySubscribers, allSubscribers, premiumSubscribers, monthNewSubscribers, monthCanceledSubscribers, subscriberTrendRaw, categoryRaw] = await Promise.all([
      this.subscriptionRepository.count({ where: { planType: 'daily' } }),
      this.subscriptionRepository.count({ where: { planType: 'weekly' } }),
      this.subscriptionRepository.count({ where: { planType: 'all' } }),
      this.subscriptionRepository.count({ where: { planType: 'premium' } }),
      this.subscriptionRepository
        .createQueryBuilder('subscription')
        .where('subscription.createdAt >= DATE_FORMAT(CURDATE(), "%Y-%m-01")')
        .getCount(),
      this.subscriptionRepository
        .createQueryBuilder('subscription')
        .where('subscription.status = :status', { status: 'CANCELED' })
        .andWhere('subscription.updatedAt >= DATE_FORMAT(CURDATE(), "%Y-%m-01")')
        .getCount(),
      this.subscriptionRepository
        .createQueryBuilder('subscription')
        .select('DATE(subscription.createdAt)', 'date')
        .addSelect('COUNT(*)', 'count')
        .where('subscription.createdAt >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)')
        .groupBy('DATE(subscription.createdAt)')
        .orderBy('date', 'ASC')
        .getRawMany<{ date: string; count: string }>(),
      this.newsRepository
        .createQueryBuilder('news')
        .leftJoin('news.category', 'category')
        .select('COALESCE(category.name, :uncategorized)', 'name')
        .addSelect('COUNT(news.id)', 'count')
        .addSelect('COALESCE(SUM(news.viewCount), 0)', 'views')
        .where('news.status = :status', { status: NewsStatus.PUBLISHED })
        .groupBy('category.name')
        .orderBy('views', 'DESC')
        .take(5)
        .setParameter('uncategorized', '카테고리 없음')
        .getRawMany<{ name: string; count: string; views: string }>(),
    ]);

    const totalViews = Number(viewsRaw?.totalViews ?? 0);
    const averageViews = Math.round(Number(viewsRaw?.averageViews ?? 0));
    const likeConversionRate = totalViews > 0 ? Math.round((totalLikes / totalViews) * 100) : 0;
    const commentParticipationRate = totalViews > 0 ? Math.round((totalComments / totalViews) * 100) : 0;
    const cancelRate = totalSubscribers > 0 ? Math.round((canceledSubscribers / totalSubscribers) * 100) : 0;
    const monthlyCancelRate = activeSubscribers + monthCanceledSubscribers > 0
      ? Math.round((monthCanceledSubscribers / (activeSubscribers + monthCanceledSubscribers)) * 100)
      : 0;
    const newsletterRecipients = Number(newsletterRaw?.recipients ?? 0);
    const newsletterSuccess = Number(newsletterRaw?.success ?? 0);
    const newsletterFailed = Number(newsletterRaw?.failed ?? 0);
    const deliverySuccessRate = newsletterRecipients > 0 ? Math.round((newsletterSuccess / newsletterRecipients) * 100) : 0;
    const aiNewsRate = totalNews > 0 ? Math.round((aiNews / totalNews) * 100) : 0;
    const totalCategoryViews = categoryRaw.reduce((sum, category) => sum + Number(category.views ?? 0), 0);
    const subscriberTrend = this.fillLastSevenDays(subscriberTrendRaw);

    return {
      totalUsers,
      totalSubscribers,
      activeSubscribers,
      canceledSubscribers,
      failedSubscribers,
      monthNewSubscribers,
      monthCanceledSubscribers,
      cancelRate,
      monthlyCancelRate,
      subscriberPlans: {
        daily: dailySubscribers,
        weekly: weeklySubscribers,
        all: allSubscribers,
        premium: premiumSubscribers,
      },
      totalNews,
      draftNews,
      scheduledNews,
      pendingNewsletter,
      todayPublishedNews,
      aiNews,
      aiNewsRate,
      totalComments,
      totalLikes,
      totalViews,
      todayViews,
      averageViews,
      likeConversionRate,
      commentParticipationRate,
      newsletterMetrics: {
        averageOpenRate: 0,
        averageClickRate: 0,
        deliverySuccessRate,
        averageDwellSeconds: 0,
        sentRecipients: newsletterRecipients,
        successCount: newsletterSuccess,
        failCount: newsletterFailed,
      },
      subscriberTrend,
      categoryPerformance: categoryRaw.map((category) => ({
        name: category.name,
        count: Number(category.count ?? 0),
        views: Number(category.views ?? 0),
        rate: totalCategoryViews > 0 ? Math.round((Number(category.views ?? 0) / totalCategoryViews) * 100) : 0,
      })),
      topNews,
      recentNews,
    };
  }

  private fillLastSevenDays(raw: { date: string; count: string }[]) {
    const counts = new Map(
      raw.map((item) => [new Date(item.date).toISOString().slice(0, 10), Number(item.count ?? 0)]),
    );

    return Array.from({ length: 7 }).map((_, index) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - index));
      const key = date.toISOString().slice(0, 10);
      return {
        date: key,
        label: date.toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' }),
        count: counts.get(key) ?? 0,
      };
    });
  }

  async getTopNews() {
    return this.newsRepository.find({
      where: { status: NewsStatus.PUBLISHED },
      order: { viewCount: 'DESC' },
      take: 10,
      relations: ['author'],
    });
  }
}
