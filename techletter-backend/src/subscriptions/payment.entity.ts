import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  JoinColumn,
} from 'typeorm';
import { User } from '../users/user.entity';
import { Subscription } from './subscription.entity';

export type PaymentStatus = 'SUCCESS' | 'FAILED' | 'REFUNDED' | 'PENDING';

@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: User;

  @Column()
  userId!: number;

  @ManyToOne(() => Subscription, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'subscriptionId' })
  subscription!: Subscription;

  @Column()
  subscriptionId!: number;

  @Column({ type: 'int' })
  amount!: number;

  @Column({
    type: 'enum',
    enum: ['SUCCESS', 'FAILED', 'REFUNDED', 'PENDING'],
    default: 'PENDING',
  })
  status!: PaymentStatus;

  @Column({ type: 'date' })
  periodStart!: string;

  @Column({ type: 'date' })
  periodEnd!: string;

  @Column({ type: 'varchar', nullable: true })
  paymentMethodBrand!: string | null;

  @Column({ type: 'varchar', nullable: true })
  paymentMethodLast4!: string | null;

  @Column({
    type: 'enum',
    enum: ['daily', 'weekly', 'all', 'premium'],
    nullable: true,
  })
  planType!: string | null;

  @Column({ type: 'varchar', nullable: true })
  pgTransactionId!: string | null;

  @Column({ type: 'timestamp', nullable: true })
  paidAt!: Date | null;

  @CreateDateColumn()
  createdAt!: Date;
}
