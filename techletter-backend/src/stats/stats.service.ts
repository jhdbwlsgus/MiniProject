import { Injectable } from '@nestjs/common';

@Injectable()
export class StatsService {
  async getDashboardStats() {
    // Implement stats calculation
    return {
      totalUsers: 0,
      totalNews: 0,
      totalSubscriptions: 0,
    };
  }
}