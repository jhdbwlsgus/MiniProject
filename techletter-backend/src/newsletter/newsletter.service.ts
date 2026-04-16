import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NewsletterSend } from './newsletter-send.entity';
import { SendLog } from './send-log.entity';

@Injectable()
export class NewsletterService {
  constructor(
    @InjectRepository(NewsletterSend)
    private newsletterSendRepository: Repository<NewsletterSend>,
    @InjectRepository(SendLog)
    private sendLogRepository: Repository<SendLog>,
  ) {}

  async sendNewsletter(data: any) {
    // Implement newsletter sending logic
    const send = this.newsletterSendRepository.create(data);
    return this.newsletterSendRepository.save(send);
  }

  getSendLogs() {
    return this.sendLogRepository.find();
  }
}