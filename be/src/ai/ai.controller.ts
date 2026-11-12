import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { ACCESS_COOKIE, CurrentUser } from '../common';
import { AiPatternService } from './ai-pattern.service';
import { GeneratePatternDto } from './dto/generate-pattern.dto';

@ApiTags('ai')
@ApiCookieAuth(ACCESS_COOKIE)
@Controller('ai')
export class AiController {
  constructor(private readonly patterns: AiPatternService) {}

  @Post('pattern')
  @HttpCode(200)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: 'Generate a palette and a seamless SVG pattern tile from a theme' })
  generate(@CurrentUser('id') userId: string, @Body() dto: GeneratePatternDto) {
    return this.patterns.generate(userId, dto);
  }

  @Get('usage')
  @ApiOperation({
    summary: 'Whether AI patterns run, their price in xu, my xu wallet, and whether the monthly AI budget is spent',
  })
  usage(@CurrentUser('id') userId: string) {
    return this.patterns.usage(userId);
  }
}
