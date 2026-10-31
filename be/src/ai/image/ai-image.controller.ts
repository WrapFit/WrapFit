import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { ACCESS_COOKIE, CurrentUser } from '../../common';
import { AiImageService } from './ai-image.service';
import { AiGalleryQueryDto, AiImageToolDto, AiImageToolParams } from './dto/ai-image-tool.dto';
import { CreateAiImageDto } from './dto/create-ai-image.dto';

@ApiTags('ai')
@ApiCookieAuth(ACCESS_COOKIE)
@Controller('ai')
export class AiImageController {
  constructor(private readonly images: AiImageService) {}

  @Get('models')
  @ApiOperation({ summary: 'AI image models on offer and the xu price of each model and tool' })
  models() {
    return this.images.catalog();
  }

  @Post('images')
  @HttpCode(202)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({
    summary: 'Spend xu on AI images for a box face; poll GET /ai/images/jobs/:id (402 not enough xu, 422 prompt refused)',
  })
  create(@CurrentUser('id') userId: string, @Body() dto: CreateAiImageDto) {
    return this.images.create(userId, dto);
  }

  @Get('images')
  @ApiOperation({ summary: '"Ảnh AI của tôi": my AI images still kept, newest first' })
  gallery(@CurrentUser('id') userId: string, @Query() query: AiGalleryQueryDto) {
    return this.images.gallery(userId, query);
  }

  @Get('images/jobs/:id')
  @ApiOperation({ summary: 'One of my AI image jobs and its images' })
  job(@CurrentUser('id') userId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.images.job(userId, id);
  }

  @Post('images/:outputId/:tool')
  @HttpCode(202)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: 'Upscale, remove the background of, or vectorize one of my AI images (xu)' })
  tool(@CurrentUser('id') userId: string, @Param() params: AiImageToolParams, @Body() dto: AiImageToolDto) {
    return this.images.runTool(userId, params.outputId, params.tool, dto);
  }
}
