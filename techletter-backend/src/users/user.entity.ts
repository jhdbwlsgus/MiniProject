import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum UserRole {
  USER = 'user',
  REPORTER = 'reporter',
  ADMIN = 'admin',
}

export enum SocialProvider {
  EMAIL = 'email',
  KAKAO = 'kakao',
  GOOGLE = 'google',
  NAVER = 'naver',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('increment')
  id!: number;

  @Column({ unique: true })
  email!: string;

  @Column({ nullable: true })
  password!: string;

  @Column()
  nickname!: string;

  @Column({ nullable: true })
  profileImage!: string;

  @Column({ type: 'text', nullable: true })
  bio!: string | null;

  @Column({ type: 'simple-json', nullable: true })
  snsLinks!: {
    website?: string;
    github?: string;
    linkedin?: string;
    x?: string;
  } | null;

  @Column({ type: 'simple-json', nullable: true })
  interestCategoryIds!: number[] | null;

  @Column({ type: 'varchar', default: UserRole.USER })
  role!: UserRole;

  @Column({ type: 'enum', enum: SocialProvider, default: SocialProvider.EMAIL })
  socialProvider!: SocialProvider;

  @Column({ nullable: true })
  socialId!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
