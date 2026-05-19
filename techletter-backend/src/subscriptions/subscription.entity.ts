import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
} from 'typeorm';
import { User } from '../users/user.entity';

export type SubscriptionStatus =
  | 'NONE'
  | 'ACTIVE'
  | 'CANCELED'
  | 'EXPIRED'
  | 'PAYMENT_FAILED';

export type PlanType = 'daily' | 'weekly' | 'all' | 'premium';
export type BillingCycle = 'monthly' | 'yearly';

@Entity('subscriptions')
export class Subscription {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: User;

  @Column()
  userId!: number;

  @Column({
    type: 'enum',
    enum: ['NONE', 'ACTIVE', 'CANCELED', 'EXPIRED', 'PAYMENT_FAILED'],
    default: 'NONE',
  })
  status!: SubscriptionStatus;

  @Column({
    type: 'enum',
    enum: ['daily', 'weekly', 'all', 'premium'],
    nullable: true,
  })
  planType!: PlanType | null;

  @Column({
    type: 'enum',
    enum: ['monthly', 'yearly'],
    default: 'monthly',
  })
  billingCycle!: BillingCycle;

  @Column({ type: 'date', nullable: true })
  startDate!: string | null;

  @Column({ type: 'date', nullable: true })
  endDate!: string | null;

  @Column({ type: 'date', nullable: true })
  nextPaymentDate!: string | null;

  @Column({ default: true })
  autoRenew!: boolean;

  @Column({ default: false })
  cancelAtPeriodEnd!: boolean;

  @Column({ type: 'date', nullable: true })
  trialEndsAt!: string | null;

  @Column({ type: 'varchar', nullable: true })
  paymentMethodBrand!: string | null;

  @Column({ type: 'varchar', nullable: true })
  paymentMethodLast4!: string | null;

  @Column({ default: true })
  dailyActive!: boolean;

  @Column({ default: true })
  weeklyActive!: boolean;

  @Column({ type: 'varchar', nullable: true })
  dailySendTime!: string | null;

  @Column({ type: 'text', nullable: true })
  adminMemo!: string | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
