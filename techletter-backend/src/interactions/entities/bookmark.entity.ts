import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';

@Entity()
export class Bookmark {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  newsId: number;

  @Column()
  userId: number;

  @CreateDateColumn()
  createdAt: Date;
}