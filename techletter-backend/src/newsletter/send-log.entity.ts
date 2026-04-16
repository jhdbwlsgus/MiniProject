import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity()
export class SendLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  newsletterId: number;

  @Column()
  recipient: string;

  @Column()
  status: string;

  @CreateDateColumn()
  createdAt: Date;
}