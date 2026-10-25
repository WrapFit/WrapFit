import { Module } from '@nestjs/common';
import { LibraryController } from './library.controller';
import { LibraryService } from './library.service';

/** Shared library of imported assets. Simple module: Controller -> Service -> Prisma + StorageService (global). */
@Module({
  controllers: [LibraryController],
  providers: [LibraryService],
})
export class LibraryModule {}
