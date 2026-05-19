import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly config: ConfigService,
    private readonly usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_SECRET') as string,
    });
  }

  async validate(payload: { sub: number; email: string; role: string }) {
    // 토큰 캐시 말고 DB에서 최신 유저 정보 가져옴
    const user = await this.usersService.findById(payload.sub);
    if (!user) return null;
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      nickname: user.nickname,
      profileImage: user.profileImage,
      socialProvider: user.socialProvider,
      bio: user.bio,
      snsLinks: user.snsLinks,
      interestCategoryIds: user.interestCategoryIds,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
