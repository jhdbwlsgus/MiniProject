import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../users/user.entity';

export enum ReporterStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  SUSPENDED = 'suspended',
  MORE_INFO_REQUIRED = 'more_info_required',
}

@Entity('reporter_profiles')
export class ReporterProfile {
  @PrimaryGeneratedColumn('increment')
  id!: number;

  @Column({ unique: true })
  userId!: number;

  @OneToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: User;

  @Column()
  userId!: number;

  @Column({ unique: true })
  slug!: string;

  @Column()
  displayName!: string;

  @Column({ type: 'varchar', nullable: true })
  headline!: string | null;

  @Column({ type: 'text', nullable: true })
  bio!: string | null;

  @Column({ type: 'varchar', nullable: true })
  profileImage!: string | null;

  @Column({ type: 'simple-json', nullable: true })
  specialties!: string[] | null;

  @Column({ type: 'simple-json', nullable: true })
  categoryIds!: number[] | null;

  @Column({ type: 'varchar', nullable: true })
  portfolioUrl!: string | null;

  @Column({ type: 'varchar', nullable: true })
  blogUrl!: string | null;

  @Column({ type: 'simple-json', nullable: true })
  plannedTopics!: string[] | null;

  @Column({ type: 'varchar', nullable: true })
  githubUrl!: string | null;

  @Column({ type: 'text', nullable: true })
  previousExperience!: string | null;

  @Column({ type: 'varchar', nullable: true })
  sampleArticleType!: string | null;

  @Column({ type: 'text', nullable: true })
  sampleArticleText!: string | null;

  @Column({ type: 'varchar', nullable: true })
  sampleArticleUrl!: string | null;

  @Column({ type: 'varchar', nullable: true })
  sampleArticleFileUrl!: string | null;

  @Column({ type: 'varchar', default: ReporterStatus.PENDING })
  status!: ReporterStatus;

  @Column({ type: 'datetime', nullable: true })
  approvedAt!: Date | null;

  @Column({ type: 'int', default: 1 })
  level!: number;

  @Column({ type: 'text', nullable: true })
  reviewMessage!: string | null;

  @Column({ type: 'datetime', nullable: true })
  reviewedAt!: Date | null;

  @Column({ type: 'int', nullable: true })
  reviewedById!: number | null;
  realName!: string;

  @Column()
  organization!: string;

  @Column({ type: 'text' })
  bio!: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  portfolioUrl!: string | null;

  @Column({ type: 'enum', enum: ReporterStatus, default: ReporterStatus.PENDING })
  status!: ReporterStatus;

  @Column({ type: 'text', nullable: true })
  rejectedReason!: string | null;

  @Column({ type: 'timestamp', nullable: true })
  approvedAt!: Date | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
