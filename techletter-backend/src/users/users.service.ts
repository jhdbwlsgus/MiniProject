import { Injectable, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, SocialProvider, UserRole } from './user.entity';
import { DeletedUser } from './deleted-user.entity';
import { Bookmark } from '../interactions/entities/bookmark.entity';
import { Like } from '../interactions/entities/like.entity';
import { News } from '../news/news.entity';

export interface UserReport {
  monthlyReadCount: number;
  bookmarkCount: number;
  likeCount: number;
  topCategories: Array<{
    category: {
      id: number;
      slug: string;
      name: string;
    };
  }>;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(DeletedUser)
    private deletedUsersRepository: Repository<DeletedUser>,
    @InjectRepository(Bookmark)
    private bookmarkRepository: Repository<Bookmark>,
    @InjectRepository(Like)
    private likeRepository: Repository<Like>,
    @InjectRepository(News)
    private newsRepository: Repository<News>,
  ) {}

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { email } });
  }

  async findById(id: number): Promise<User | null> {
    return this.usersRepository.findOne({ where: { id } });
  }

  async listForAdmin(): Promise<User[]> {
    return this.usersRepository.find({
      order: { createdAt: 'DESC' },
      take: 200,
    });
  }

  async updateRoleForAdmin(adminId: number, userId: number, role: UserRole): Promise<User> {
    if (!Object.values(UserRole).includes(role)) {
      throw new BadRequestException('변경할 수 없는 권한입니다.');
    }
    if (adminId === userId && role !== UserRole.ADMIN) {
      throw new BadRequestException('본인 관리자 권한은 직접 해제할 수 없습니다.');
    }
    const user = await this.findById(userId);
    if (!user) throw new NotFoundException('유저를 찾을 수 없습니다.');
    user.role = role;
    return this.usersRepository.save(user);
  }

  async getUserReport(userId: number): Promise<UserReport> {
    const [bookmarks, likeCount] = await Promise.all([
      this.bookmarkRepository.find({ where: { userId } }),
      this.likeRepository.count({ where: { userId } }),
    ]);
    const bookmarkCount = bookmarks.length;
    const newsIds = [...new Set(bookmarks.map((bookmark) => bookmark.newsId))];
    const bookmarkedNews = newsIds.length
      ? await this.newsRepository.find({
          where: { id: In(newsIds) },
          relations: ['category'],
        })
      : [];

    const categoryMap = new Map<number, { count: number; category: NonNullable<News['category']> }>();
    for (const news of bookmarkedNews) {
      if (!news.category) continue;
      const current = categoryMap.get(news.category.id);
      categoryMap.set(news.category.id, {
        count: (current?.count ?? 0) + 1,
        category: news.category,
      });
    }

    const topCategories = [...categoryMap.values()]
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
      .map(({ category }) => ({
        category: {
          id: category.id,
          slug: category.slug,
          name: category.name,
        },
      }));

    return {
      monthlyReadCount: 0,
      bookmarkCount,
      likeCount,
      topCategories,
    };
  }

  async createUser(data: {
    email: string;
    password?: string;
    nickname: string;
    socialProvider?: SocialProvider;
    socialId?: string;
  }): Promise<User> {
    await this.ensureNotDeletedUser(data.email, data.socialProvider, data.socialId);

    const existing = await this.findByEmail(data.email);
    if (existing) throw new ConflictException('이미 사용 중인 이메일입니다.');

    const hashedPassword = data.password
      ? await bcrypt.hash(data.password, 10)
      : null;

    const user = this.usersRepository.create({
      ...data,
      password: hashedPassword ?? undefined,
    });

    return this.usersRepository.save(user);
  }

  async findOrCreateSocialUser(data: {
    email: string;
    nickname: string;
    socialProvider: SocialProvider;
    socialId: string;
    profileImage?: string;
  }): Promise<User> {
    await this.ensureNotDeletedUser(data.email, data.socialProvider, data.socialId);

    const existing = await this.findByEmail(data.email);
    if (existing) {
      existing.socialProvider = data.socialProvider;
      existing.socialId = data.socialId;
      if (data.profileImage) existing.profileImage = data.profileImage;
      return this.usersRepository.save(existing);
    }

    const user = this.usersRepository.create({
      email: data.email,
      nickname: data.nickname,
      socialProvider: data.socialProvider,
      socialId: data.socialId,
      profileImage: data.profileImage,
    });

    return this.usersRepository.save(user);
  }

  async updateUser(id: number, data: {
    nickname?: string;
    profileImage?: string;
    bio?: string;
    snsLinks?: {
      website?: string;
      github?: string;
      linkedin?: string;
      x?: string;
    };
    interestCategoryIds?: number[];
  }): Promise<User> {
    const user = await this.findById(id);
    if (!user) throw new ConflictException('유저를 찾을 수 없습니다.');
    if (data.nickname !== undefined) user.nickname = data.nickname.trim();
    if (data.profileImage !== undefined) user.profileImage = data.profileImage.trim();
    if (data.bio !== undefined) user.bio = data.bio.trim();
    if (data.snsLinks !== undefined) user.snsLinks = data.snsLinks;
    if (data.interestCategoryIds !== undefined) user.interestCategoryIds = data.interestCategoryIds;
    return this.usersRepository.save(user);
  }

  async updateRole(id: number, role: UserRole): Promise<User> {
    const user = await this.findById(id);
    if (!user) throw new NotFoundException('사용자를 찾을 수 없습니다.');
    user.role = role;
    return this.usersRepository.save(user);
  }

  async validatePassword(password: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
  }

  // ✅ 1. 비밀번호 변경 로직 추가
  async updatePassword(userId: number, currentPassword: string, newPassword: string): Promise<{ message: string }> {
    const user = await this.findById(userId);
    if (!user) throw new NotFoundException('유저를 찾을 수 없습니다.');

    // 소셜 로그인 등 비밀번호가 없는 계정 예외 처리
    if (!user.password) {
      throw new BadRequestException('소셜 로그인 계정은 비밀번호를 변경할 수 없습니다.');
    }

    // 현재 비밀번호 확인 (미리 만들어두신 validatePassword 활용)
    const isMatch = await this.validatePassword(currentPassword, user.password);
    if (!isMatch) throw new BadRequestException('현재 비밀번호가 일치하지 않습니다.');

    // 새 비밀번호 암호화 후 저장
    user.password = await bcrypt.hash(newPassword, 10);
    await this.usersRepository.save(user);

    return { message: '비밀번호가 성공적으로 변경되었습니다.' };
  }

  // ✅ 2. 회원 탈퇴 로직 추가
  async deleteUser(userId: number): Promise<{ message: string }> {
    const user = await this.findById(userId);
    if (!user) throw new NotFoundException('유저를 찾을 수 없습니다.');

    const deletedUser = this.deletedUsersRepository.create({
      email: user.email,
      socialProvider: user.socialProvider,
      socialId: user.socialId,
    });
    await this.deletedUsersRepository.save(deletedUser);

    await this.usersRepository.remove(user);
    return { message: '회원 탈퇴가 완료되었습니다.' };
  }

  private async ensureNotDeletedUser(
    email: string,
    socialProvider?: SocialProvider,
    socialId?: string,
  ) {
    const deletedByEmail = await this.deletedUsersRepository.findOne({ where: { email } });
    if (deletedByEmail) {
      throw new ConflictException('탈퇴한 계정은 다시 가입할 수 없습니다.');
    }

    if (socialProvider && socialId) {
      const deletedBySocial = await this.deletedUsersRepository.findOne({
        where: { socialProvider, socialId },
      });
      if (deletedBySocial) {
        throw new ConflictException('탈퇴한 소셜 계정은 다시 로그인할 수 없습니다.');
      }
    }
  }

}
