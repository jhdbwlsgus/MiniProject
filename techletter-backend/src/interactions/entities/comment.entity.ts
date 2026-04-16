import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';

@Entity()
export class Comment {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  newsId: number;

  @Column()
  userId: number;

  @Column('text')
  content: string;

  @CreateDateColumn()
  createdAt: Date;
}