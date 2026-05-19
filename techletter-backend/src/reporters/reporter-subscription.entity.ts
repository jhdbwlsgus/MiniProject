import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../users/user.entity';
import { ReporterProfile } from './reporter-profile.entity';

@Entity('reporter_subscriptions')
@Index(['userId', 'reporterProfileId'], { unique: true })
export class ReporterSubscription {
  @PrimaryGeneratedColumn('increment')
  id!: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column()
  userId!: number;

  @ManyToOne(() => ReporterProfile, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'reporter_profile_id' })
  reporterProfile!: ReporterProfile;

  @Column()
  reporterProfileId!: number;

  @CreateDateColumn()
  createdAt!: Date;
}
