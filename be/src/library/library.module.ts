import { Module } from '@nestjs/common';
import { LibraryController } from './library.controller';
import { LibraryService } from './library.service';
import { StockPhotosService } from './stock-photos.service';

/**
 * Shared library of imported assets, and the stock photos proxy (Pexels). Simple module: Controller -> Services ->
 * Prisma + StorageService (global).
 */
@Module({
  controllers: [LibraryController],
  providers: [LibraryService, StockPhotosService],
})
export class LibraryModule {}
