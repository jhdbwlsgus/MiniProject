import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity()
export class PushSubscription {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @Column('json')
  subscription: any;

  @CreateDateColumn()
  createdAt: Date;
}