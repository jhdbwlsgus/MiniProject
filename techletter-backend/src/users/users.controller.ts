// 상단 import 부분에 Patch, Delete 추가
import { Controller, Get, Put, Patch, Delete, Param, Body, UseGuards, Request, ForbiddenException } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UserRole } from './user.entity';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  getMe(@Request() req: any) {
    return req.user;
  }

  @Get('me/report')
  @UseGuards(JwtAuthGuard)
  getMyReport(@Request() req: any) {
    return this.usersService.getUserReport(req.user.id);
  }

  @Get('admin')
  @UseGuards(JwtAuthGuard)
  listForAdmin(@Request() req: any) {
    if (req.user.role !== UserRole.ADMIN) throw new ForbiddenException('관리자만 접근 가능합니다.');
    return this.usersService.listForAdmin();
  }

  @Patch('admin/:id/role')
  @UseGuards(JwtAuthGuard)
  updateRoleForAdmin(@Request() req: any, @Param('id') id: string, @Body() body: { role: UserRole }) {
    if (req.user.role !== UserRole.ADMIN) throw new ForbiddenException('관리자만 접근 가능합니다.');
    return this.usersService.updateRoleForAdmin(req.user.id, +id, body.role);
  }

  @Put('me')
  @UseGuards(JwtAuthGuard)
  updateMe(
    @Request() req: any,
    @Body() body: {
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
    },
  ) {
    return this.usersService.updateUser(req.user.id, body);
  }

  // ✅ 1. 비밀번호 변경 API 추가 (프론트엔드의 api.patch와 매칭)
  @Patch('me/password')
  @UseGuards(JwtAuthGuard)
  updatePassword(@Request() req: any, @Body() body: any) {
    return this.usersService.updatePassword(req.user.id, body.currentPassword, body.newPassword);
  }

  // ✅ 2. 회원 탈퇴 API 추가 (프론트엔드의 api.delete와 매칭)
  @Delete('me')
  @UseGuards(JwtAuthGuard)
  deleteMe(@Request() req: any) {
    return this.usersService.deleteUser(req.user.id);
  }

  @Get(':id')
  async getUser(@Param('id') id: string) {
    return this.usersService.findById(+id);
  }
}
