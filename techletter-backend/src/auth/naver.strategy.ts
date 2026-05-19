import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import OAuth2Strategy from 'passport-oauth2';
import { SocialProvider } from '../users/user.entity';

interface NaverProfile {
  id: string;
  email?: string;
  nickname?: string;
  name?: string;
  profile_image?: string;
}

interface NaverProfileResponse {
  resultcode?: string;
  message?: string;
  response?: NaverProfile;
}

@Injectable()
export class NaverStrategy extends PassportStrategy(OAuth2Strategy, 'naver') {
  constructor(config: ConfigService) {
    super({
      authorizationURL: 'https://nid.naver.com/oauth2.0/authorize',
      tokenURL: 'https://nid.naver.com/oauth2.0/token',
      clientID: config.get<string>('NAVER_CLIENT_ID') ?? 'missing-naver-client-id',
      clientSecret: config.get<string>('NAVER_CLIENT_SECRET') ?? 'missing-naver-client-secret',
      callbackURL:
        config.get<string>('NAVER_CALLBACK_URL') ?? 'http://localhost:3000/auth/naver/callback',
    });
  }

  authorizationParams(options: { authType?: string }) {
    return options.authType ? { auth_type: options.authType } : {};
  }

  userProfile(accessToken: string, done: (error?: unknown, profile?: NaverProfile) => void) {
    fetch('https://openapi.naver.com/v1/nid/me', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })
      .then(async (res) => {
        const body = (await res.json()) as NaverProfileResponse;
        if (!res.ok || !body.response) {
          throw new UnauthorizedException(body.message ?? 'Naver profile request failed');
        }

        done(undefined, body.response);
      })
      .catch((error) => done(error));
  }

  validate(
    accessToken: string,
    refreshToken: string,
    profile: NaverProfile,
    done: (error: Error | null, user?: unknown) => void,
  ) {
    if (!profile.email) {
      return done(new UnauthorizedException('네이버 계정 이메일 제공에 동의해야 합니다.'));
    }

    return done(null, {
      email: profile.email,
      nickname: profile.nickname ?? profile.name ?? profile.email.split('@')[0],
      socialProvider: SocialProvider.NAVER,
      socialId: profile.id,
      profileImage: profile.profile_image,
    });
  }
}
