import { Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ACCESS_COOKIE, CurrentUser } from '../common';
import { ListNotificationsQueryDto } from './dto/list-notifications.dto';
import { NOTIFICATION_PAGE_DEFAULT } from './notifications.constants';
import { NotificationsService } from './notifications.service';

/**
 * My notification inbox (docs/25 S8). Signed-in users only, each sees and changes only their own rows. Rate limit: the
 * global one (THROTTLE_LIMIT per minute and IP, 100 by default), like the other reads of the workspace; the frontend
 * polls the unread count about once a minute.
 */
@ApiTags('notifications')
@ApiCookieAuth(ACCESS_COOKIE)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Thông báo của tôi, mới nhất trước; `nextBefore` để tải tiếp' })
  list(@CurrentUser('id') userId: string, @Query() query: ListNotificationsQueryDto) {
    return this.notifications.list(userId, query.limit ?? NOTIFICATION_PAGE_DEFAULT, query.before);
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Số thông báo chưa đọc (chuông trên header)' })
  unreadCount(@CurrentUser('id') userId: string) {
    return this.notifications.unreadCount(userId);
  }

  @Post('read-all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Đánh dấu mọi thông báo đã đọc' })
  markAllRead(@CurrentUser('id') userId: string) {
    return this.notifications.markAllRead(userId);
  }

  @Post(':id/read')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Đánh dấu một thông báo đã đọc (gọi lại không đổi gì); 404 nếu không phải của tôi' })
  markRead(@CurrentUser('id') userId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.notifications.markRead(userId, id);
  }
}
