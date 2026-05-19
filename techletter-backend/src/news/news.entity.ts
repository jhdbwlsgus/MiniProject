import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  ManyToMany,
  JoinTable,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
} from 'typeorm';
import { User } from '../users/user.entity';
import { Category } from '../categories/category.entity';
import { Tag } from '../tags/tag.entity';

export enum NewsStatus {
  DRAFT = 'draft',
  REVIEW = 'review',
  APPROVED = 'approved',
  PUBLISHED = 'published',
  SCHEDULED = 'scheduled',
}

@Entity('news')
export class News {
  @PrimaryGeneratedColumn('increment')
  id!: number;

  @Column()
  title!: string;

  @Column({ nullable: true })
  subtitle!: string;

  @Column({ type: 'text' })
  content!: string;

  @Column({ nullable: true })
  lead!: string;

  @Column({ nullable: true })
  thumbnailUrl!: string;

  @Column({ nullable: true })
  slug!: string;

  @Column({ nullable: true })
  metaDescription!: string;

  @Column({ nullable: true })
  metaKeywords!: string;

  @Column({ nullable: true })
  ogTitle!: string;

  @Column({ nullable: true })
  ogImage!: string;

  @Column({ type: 'simple-json', nullable: true })
  sourceReferences!: Array<{
    title?: string;
    url?: string;
    source?: string;
    type?: string;
    memo?: string;
  }> | null;

  @Column({ default: false })
  isPremium!: boolean;

  @Column({ type: 'text', nullable: true })
  premiumExcerpt!: string | null;

  @Column({ type: 'simple-json', nullable: true })
  premiumContent!: {
    keyPoints?: string[];
    editorComment?: string;
    relatedLinks?: Array<{ title?: string; url?: string }>;
  } | null;

  @Column({ type: 'enum', enum: NewsStatus, default: NewsStatus.DRAFT })
  status!: NewsStatus;

  @Column({ default: 0 })
  viewCount!: number;

  @Column({ default: 0 })
  likeCount!: number;

  @Column({ default: 0 })
  shareCount!: number;

  @Column({ default: false })
  homeMain!: boolean;

  @Column({ default: false })
  homeRecommended!: boolean;

  @Column({ default: false })
  homeUrgent!: boolean;

  @Column({ type: 'int', default: 0 })
  homeOrder!: number;

  @Column({ nullable: true })
  scheduledAt!: Date;

  @Column({ nullable: true })
  publishedAt!: Date;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'authorId' })
  author!: User;

  @Column()
  authorId!: number;

  @ManyToOne(() => Category, { nullable: true })
  @JoinColumn({ name: 'categoryId' })
  category!: Category;

  @Column({ nullable: true })
  categoryId!: number;

  @ManyToMany(() => Tag)
  @JoinTable({
    name: 'news_tags',
    joinColumn: { name: 'news_id' },
    inverseJoinColumn: { name: 'tag_id' },
  })
  tags!: Tag[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
  
  @Column({ type: 'text', nullable: true })
  aiSummary?: string;
}
