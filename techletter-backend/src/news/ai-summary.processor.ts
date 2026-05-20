import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { NewsService } from './news.service';

@Processor('ai-summary')
export class AiSummaryProcessor extends WorkerHost {
  constructor(private readonly newsService: NewsService) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    if (job.name === 'summarize') {
      const { newsId, content } = job.data;
      console.log(`⚙️ [Worker] 뉴스 ${newsId} 요약 시작...`);
      
      // NewsService에 있는 요약 로직 호출 (private라도 필요시 public으로 변경하거나 로직 공유)
      const summary = await (this.newsService as any).generateAiSummary(content);
      
      // DB 업데이트
      await this.newsService.updateAiSummary(newsId, summary);
      console.log(`✅ [Worker] 뉴스 ${newsId} 요약 완료!`);
    }
  }
}