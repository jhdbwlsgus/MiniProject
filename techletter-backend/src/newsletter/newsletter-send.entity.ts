import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity()
export class NewsletterSend {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  subject: string;

  @Column('text')
  content: string;

  @CreateDateColumn()
  sentAt: Date;
}