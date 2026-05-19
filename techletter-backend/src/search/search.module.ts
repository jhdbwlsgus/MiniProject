import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';
import { News } from '../news/news.entity';
import { ReporterProfile } from '../reporters/reporter-profile.entity';

@Module({
  imports: [TypeOrmModule.forFeature([News, ReporterProfile])],
  controllers: [SearchController],
  providers: [SearchService],
})
export class SearchModule {}
