import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { News } from './news.entity';
import { User } from '../users/user.entity';

@Entity('news_views')
@Index(['userId', 'createdAt'])
@Index(['newsId', 'createdAt'])
export class NewsView {
  @PrimaryGeneratedColumn('increment')
  id!: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ name: 'user_id' })
  userId!: number;

  @ManyToOne(() => News, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'news_id' })
  news!: News;

  @Column({ name: 'news_id' })
  newsId!: number;

  @CreateDateColumn()
  createdAt!: Date;
}
