import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ReporterProfile } from './reporter-profile.entity';

export enum ReporterFeedType {
  COMMENT = 'comment',
  BRIEFING = 'briefing',
  BEHIND = 'behind',
  ANALYSIS = 'analysis',
  LINK = 'link',
  ISSUE = 'issue',
}

@Entity('reporter_feeds')
export class ReporterFeed {
  @PrimaryGeneratedColumn('increment')
  id!: number;

  @ManyToOne(() => ReporterProfile, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'reporter_profile_id' })
  reporterProfile!: ReporterProfile;

  @Column()
  reporterProfileId!: number;

  @Column({ type: 'enum', enum: ReporterFeedType, default: ReporterFeedType.COMMENT })
  type!: ReporterFeedType;

  @Column({ type: 'varchar', nullable: true })
  title!: string | null;

  @Column({ type: 'text' })
  content!: string;

  @Column({ type: 'varchar', nullable: true })
  linkUrl!: string | null;

  @Column({ default: true })
  published!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
