import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { ACCESS_COOKIE, CurrentUser } from '../common';
import { InspectFontDto } from './dto/inspect-font.dto';
import { PresignUploadDto } from './dto/presign-upload.dto';
import { StorageService } from './storage.service';

@ApiTags('storage')
@ApiCookieAuth(ACCESS_COOKIE)
@Controller('storage')
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  @Post('presigned-upload')
  @HttpCode(200)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @ApiOperation({
    summary: 'Get a pre-signed URL to upload one file directly to object storage (checks format, size and quota)',
  })
  presignUpload(@CurrentUser('id') userId: string, @Body() dto: PresignUploadDto) {
    return this.storageService.presignUpload(userId, dto);
  }

  @Post('fonts/inspect')
  @HttpCode(200)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @ApiOperation({ summary: 'Check an uploaded font: it must open and draw every Vietnamese letter; returns its family name' })
  inspectFont(@CurrentUser('id') userId: string, @Body() dto: InspectFontDto) {
    return this.storageService.inspectFont(userId, dto.url);
  }

  @Get('usage')
  @ApiOperation({ summary: 'My storage usage and quota (depends on the subscription tier)' })
  usage(@CurrentUser('id') userId: string) {
    return this.storageService.usage(userId);
  }
}
