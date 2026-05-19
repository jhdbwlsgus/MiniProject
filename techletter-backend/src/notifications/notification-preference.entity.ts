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

@Entity('notification_preferences')
export class NotificationPreference {
  @PrimaryGeneratedColumn('increment')
  id!: number;

  @OneToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ unique: true })
  userId!: number;

  @Column({ default: true })
  serviceTermsAgreed!: boolean;

  @Column({ default: true })
  privacyAgreed!: boolean;

  @Column({ default: false })
  marketingAgreed!: boolean;

  @Column({ default: true })
  emailEnabled!: boolean;

  @Column({ default: false })
  smsEnabled!: boolean;

  @Column({ default: false })
  kakaoEnabled!: boolean;

  @Column({ default: true })
  inAppEnabled!: boolean;

  @Column({ default: true })
  newsletterEnabled!: boolean;

  @Column({ default: true })
  reporterNewsEnabled!: boolean;

  @Column({ default: true })
  activityEnabled!: boolean;

  @Column({ default: true })
  subscriptionEnabled!: boolean;

  @Column({ default: true })
  recommendationEnabled!: boolean;

  @Column({ type: 'timestamp', nullable: true })
  agreedAt!: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  serviceTermsAgreedAt!: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  privacyAgreedAt!: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  marketingAgreedAt!: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  emailAgreedAt!: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  smsAgreedAt!: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  kakaoAgreedAt!: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  recommendationAgreedAt!: Date | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
