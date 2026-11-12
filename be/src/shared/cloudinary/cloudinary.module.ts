import { Global, Module } from '@nestjs/common';
import { CloudinaryService } from './cloudinary.service';

/** Global: any module can inject CloudinaryService once public images move off R2. */
@Global()
@Module({
  providers: [CloudinaryService],
  exports: [CloudinaryService],
})
export class CloudinaryModule {}
