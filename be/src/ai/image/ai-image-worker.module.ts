import { BullModule } from '@nestjs/bullmq';
import { Logger, Module } from '@nestjs/common';
import { BillingCoreModule } from '../../billing';
import { ConfigService } from '../../common';
import { AiImageRefunds } from './ai-image-refunds';
import { AI_IMAGE_QUEUE } from './ai-image.constants';
import { AiImageProcessor } from './ai-image.processor';
import { FakeImageProvider } from './fake-image.provider';
import { FalImageProvider } from './fal-image.provider';
import { IMAGE_PROVIDER, type ImageProvider } from './image-provider';

/** Worker side of AI images: the BullMQ processor and the provider. Imported by WorkerModule, never by the API. */
@Module({
  imports: [BillingCoreModule, BullModule.registerQueue({ name: AI_IMAGE_QUEUE })],
  providers: [
    AiImageProcessor,
    AiImageRefunds,
    {
      provide: IMAGE_PROVIDER,
      inject: [ConfigService],
      useFactory: (config: ConfigService): ImageProvider | null => {
        const { provider, falKey, timeoutMs } = config.get('ai.image');
        if (provider === 'fake') {
          new Logger('AiImageWorkerModule').warn('AI_IMAGE_PROVIDER=fake: AI images are placeholder gradients');
          return new FakeImageProvider();
        }
        return falKey ? new FalImageProvider(falKey, timeoutMs) : null;
      },
    },
  ],
})
export class AiImageWorkerModule {}
