import { Module } from '@nestjs/common';
import { ProjectsModule } from '../projects';
import { PublicReviewController, ReviewsController } from './reviews.controller';
import { ReviewsService } from './reviews.service';

/** Design review: comments and the print approval through a secret link (docs-old/23 S23). */
@Module({
  imports: [ProjectsModule],
  controllers: [ReviewsController, PublicReviewController],
  providers: [ReviewsService],
})
export class ReviewsModule {}
