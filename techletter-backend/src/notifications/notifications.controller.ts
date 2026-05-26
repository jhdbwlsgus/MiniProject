import { 
  Controller, Get, Put, Patch, Body, Param, UseGuards, 
  Request, Sse, MessageEvent, Query, UnauthorizedException 
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { JwtService } from '@nestjs/jwt';
import { NotificationsService, NotificationPreferenceDto } from './notifications.service';

@Controller('notifications')
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly jwtService: JwtService,
  ) {}

  // ─────────────────────────────────────────────
  // 1. 알림 목록 조회 
  // ─────────────────────────────────────────────
  @Get()
  @UseGuards(JwtAuthGuard)
  async getNotifications(@Request() req: any) {
    return this.notificationsService.list(req.user.id);
  }

  // ─────────────────────────────────────────────
  // 2. 안 읽은 알림 개수 가져오기
  // ─────────────────────────────────────────────
  @Get('unread')
  @UseGuards(JwtAuthGuard)
  async getUnreadCount(@Request() req: any) {
    return this.notificationsService.unreadCount(req.user.id);
  }

  // ─────────────────────────────────────────────
  // 3. 모든 알림 읽음 처리
  // ─────────────────────────────────────────────
  @Put('read-all')
  @UseGuards(JwtAuthGuard)
  async markAllRead(@Request() req: any) {
    return this.notificationsService.markAllRead(req.user.id);
  }

  // ─────────────────────────────────────────────
  // 4. 특정 알림 하나만 읽음 처리
  // ─────────────────────────────────────────────
  @Put(':id/read')
  @UseGuards(JwtAuthGuard)
  async markRead(@Param('id') id: string, @Request() req: any) {
    return this.notificationsService.markRead(req.user.id, +id);
  }

  // ─────────────────────────────────────────────
  // 5. 알림 설정(환경설정) 조회
  // ─────────────────────────────────────────────
  @Get('preferences')
  @UseGuards(JwtAuthGuard)
  async getPreferences(@Request() req: any) {
    return this.notificationsService.getPreferences(req.user.id);
  }

  // ─────────────────────────────────────────────
  // 6. 알림 설정 수정 (💡 프론트엔드 에러 원인 해결: Patch로 변경!)
  // ─────────────────────────────────────────────
  @Patch('preferences')
  @UseGuards(JwtAuthGuard)
  async updatePreferences(@Request() req: any, @Body() dto: NotificationPreferenceDto) {
    return this.notificationsService.updatePreferences(req.user.id, dto);
  }

  // ─────────────────────────────────────────────
  // 7. 실시간 알림 스트림 (SSE)
  // ─────────────────────────────────────────────
  @Sse('stream')
  stream(@Query('token') token: string): Observable<MessageEvent> {
    if (!token) {
      throw new UnauthorizedException('Token is required for SSE');
    }

    try {
      const decoded = this.jwtService.verify(token); 
      const userId = decoded.id;

      return this.notificationsService.notifyStream.pipe(
        filter((event) => event.userId === userId),
        map((event) => ({ data: event.data } as MessageEvent)),
      );
    } catch (err) {
      throw new UnauthorizedException('Invalid token');
    }
  }
}