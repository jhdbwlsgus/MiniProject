import { Controller, Post, Body, Get, Req, Res, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { GoogleCallbackGuard, GoogleLoginGuard, GoogleSignupGuard } from './google-oauth.guard';
import { KakaoCallbackGuard, KakaoLoginGuard, KakaoSignupGuard } from './kakao-oauth.guard';
import { NaverCallbackGuard, NaverLoginGuard, NaverSignupGuard } from './naver-oauth.guard';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Post('signup')
  signup(@Body() dto: SignupDto) {
    return this.authService.signup(dto);
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Get('google')
  @UseGuards(GoogleSignupGuard)
  google() {}

  @Get('google/signup')
  @UseGuards(GoogleSignupGuard)
  googleSignup() {}

  @Get('google/login')
  @UseGuards(GoogleLoginGuard)
  googleLogin() {}

  @Get('google/callback')
  @UseGuards(GoogleCallbackGuard)
  async googleCallback(@Req() req, @Res() res: Response) {
    return this.handleOauthCallback(req, res);
  }

  @Get('kakao')
  @UseGuards(KakaoSignupGuard)
  kakao() {}

  @Get('kakao/signup')
  @UseGuards(KakaoSignupGuard)
  kakaoSignup() {}

  @Get('kakao/login')
  @UseGuards(KakaoLoginGuard)
  kakaoLogin() {}

  @Get('kakao/callback')
  @UseGuards(KakaoCallbackGuard)
  async kakaoCallback(@Req() req, @Res() res: Response) {
    return this.handleOauthCallback(req, res);
  }

  @Get('naver')
  @UseGuards(NaverSignupGuard)
  naver() {}

  @Get('naver/signup')
  @UseGuards(NaverSignupGuard)
  naverSignup() {}

  @Get('naver/login')
  @UseGuards(NaverLoginGuard)
  naverLogin() {}

  @Get('naver/callback')
  @UseGuards(NaverCallbackGuard)
  async naverCallback(@Req() req, @Res() res: Response) {
    return this.handleOauthCallback(req, res);
  }

  private async handleOauthCallback(req, res: Response) {
    const mode = this.getOauthMode(req);

    if (this.isOauthError(req.user)) {
      return this.redirectWithError(res, req.user.oauthError, mode);
    }

    try {
      const result = await this.authService.socialLogin(req.user, mode);
      return this.redirectWithToken(res, result.accessToken, mode);
    } catch (error) {
      return this.redirectWithError(res, error, mode);
    }
  }

  private redirectWithToken(res: Response, accessToken: string, mode: 'login' | 'signup') {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL') ?? 'http://localhost:3001';
    return res.redirect(
      `${frontendUrl}/auth/callback?token=${encodeURIComponent(accessToken)}&mode=${mode}`,
    );
  }

  private redirectWithError(res: Response, error: unknown, mode: 'login' | 'signup' = 'signup') {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL') ?? 'http://localhost:3001';
    const message = this.getErrorMessage(error);
    const path = mode === 'login' ? 'login' : 'signup';

    return res.redirect(`${frontendUrl}/${path}?error=${encodeURIComponent(message)}`);
  }

  private getErrorMessage(error: unknown) {
    if (error instanceof Error) return error.message;
    if (typeof error === 'string') return error;
    return '소셜 인증에 실패했습니다. 다시 시도해주세요.';
  }

  private getOauthMode(req: { query?: { state?: string } }): 'login' | 'signup' {
    return req.query?.state === 'login' ? 'login' : 'signup';
  }

  private isOauthError(user: unknown): user is { oauthError: string } {
    return Boolean(user && typeof user === 'object' && 'oauthError' in user);
  }
}
