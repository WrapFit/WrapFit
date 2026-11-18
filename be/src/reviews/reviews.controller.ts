import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { ACCESS_COOKIE, CurrentUser, Public } from '../common';
import { ProjectOwnerGuard } from '../projects';
import { ApproveDto, CreateCommentDto, GuestCommentDto, ResolveCommentDto } from './dto/review.dto';
import { ReviewsService } from './reviews.service';

/** The owner's side of the design review (docs/23 S23): the link, the comments, the approval. */
@ApiTags('reviews')
@ApiCookieAuth(ACCESS_COOKIE)
@UseGuards(ProjectOwnerGuard)
@Controller('projects/:id/review')
export class ReviewsController {
  constructor(private readonly reviews: ReviewsService) {}

  @Get()
  @ApiOperation({ summary: 'Review link, approval ("Đã duyệt in") and comments of my design' })
  state(@Param('id') projectId: string) {
    return this.reviews.state(projectId);
  }

  @Post('link')
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'Create the review link, or replace it (the old link stops working)' })
  openLink(@Param('id') projectId: string) {
    return this.reviews.openLink(projectId);
  }

  @Delete('link')
  @ApiOperation({ summary: 'Turn the review link off (the approval is kept)' })
  closeLink(@Param('id') projectId: string) {
    return this.reviews.closeLink(projectId);
  }

  @Post('comments')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @ApiOperation({ summary: 'Add my own comment (a reply, a note for the reviewers)' })
  comment(@Param('id') projectId: string, @CurrentUser('id') userId: string, @Body() dto: CreateCommentDto) {
    return this.reviews.addOwnerComment(projectId, userId, dto);
  }

  @Patch('comments/:commentId')
  @ApiOperation({ summary: 'Mark a comment resolved (or open again)' })
  resolve(@Param('id') projectId: string, @Param('commentId', ParseUUIDPipe) commentId: string, @Body() dto: ResolveCommentDto) {
    return this.reviews.resolve(projectId, commentId, dto.resolved);
  }

  @Delete('comments/:commentId')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete a comment' })
  remove(@Param('id') projectId: string, @Param('commentId', ParseUUIDPipe) commentId: string) {
    return this.reviews.removeComment(projectId, commentId);
  }
}

/** The reviewer's side: anyone with the secret link, no account (docs/23 S23). */
@ApiTags('reviews')
@Public()
@Controller('review/:token')
export class PublicReviewController {
  constructor(private readonly reviews: ReviewsService) {}

  @Get()
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @ApiOperation({ summary: 'The design to review, its comments and approval (404 for an unknown or closed link)' })
  view(@Param('token') token: string) {
    return this.reviews.publicView(token);
  }

  @Post('comments')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'Comment on the design as a reviewer (name + text, optionally pinned to a face)' })
  comment(@Param('token') token: string, @Body() dto: GuestCommentDto) {
    return this.reviews.addGuestComment(token, dto);
  }

  @Post('approve')
  @HttpCode(200)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: '"Duyệt in": approve the version of the design shown (409 DESIGN_CHANGED when it changed)' })
  approve(@Param('token') token: string, @Body() dto: ApproveDto) {
    return this.reviews.approve(token, dto);
  }
}
