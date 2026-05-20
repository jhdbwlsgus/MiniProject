import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatbotController } from './chatbot.controller';
import { ChatbotService } from './chatbot.service';
import { ReporterChatbotService } from './reporter-chatbot.service'; 
import { News } from '../news/news.entity'; 
import { SearchModule } from '../search/search.module'; // 👈 import 추가!

@Module({
  imports: [
    TypeOrmModule.forFeature([News]), 
    SearchModule // 👈 여기 추가!
  ], 
  controllers: [ChatbotController],
  providers: [
    ChatbotService, 
    ReporterChatbotService, 
  ],
})
export class ChatbotModule {}