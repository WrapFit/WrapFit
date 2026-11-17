import { Body, Controller, Get, Param, ParseIntPipe, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Role } from '@prisma/client';
import { CurrentUser, Public, Roles } from '../common';
import { CreateLibraryAssetDto, QueryLibraryDto, UpdateLibraryAssetDto } from './dto/library.dto';
import { SearchStockPhotosDto } from './dto/stock-photos.dto';
import { StockPhotosService } from './stock-photos.service';
import { LIBRARY_LICENSES } from './library-file.rules';
import { LibraryService } from './library.service';

@ApiTags('library')
@Controller('library')
export class LibraryController {
  constructor(
    private readonly library: LibraryService,
    private readonly stock: StockPhotosService,
  ) {}

  @Get('stock/photos')
  // The Pexels key is shared by everyone (200 requests per hour): answers are cached, and one client cannot drain it.
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @ApiOperation({
    summary: 'Stock photos (Pexels) for the studio, searched through the backend',
    description:
      'Answers { enabled: false, items: [] } when PEXELS_API_KEY is not set; 502 STOCK_PROVIDER_ERROR when Pexels fails. ' +
      'Identical searches are cached 10 minutes (curated pages 1 hour). 30 requests per minute; 429 STOCK_RATE_LIMITED ' +
      '(with Retry-After) once your share of the Pexels allowance, or the whole of it, is spent for the hour.',
  })
  searchStock(@CurrentUser('id') userId: string, @Query() query: SearchStockPhotosDto) {
    return this.stock.search(userId, query);
  }

  @Post('stock/photos/:id/import')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({
    summary: 'Copy a stock photo into your files to place it on a design',
    description:
      'The photo is downloaded once and stored as one of your IMAGE uploads (print files never depend on an outside link); ' +
      'the answer carries the credit to show. 403 when the storage quota is full, 422 STOCK_PHOTO_TOO_LARGE above 60 MB, ' +
      '429 STOCK_RATE_LIMITED like the search, 503 STOCK_UNAVAILABLE without a key. 10 requests per minute.',
  })
  importStock(@CurrentUser('id') userId: string, @Param('id', ParseIntPipe) id: number) {
    return this.stock.import(userId, id);
  }

  @Get('assets')
  @Public()
  @ApiOperation({ summary: 'Active assets of the shared library (paginated, filters: category, occasion, q)' })
  list(@Query() query: QueryLibraryDto) {
    return this.library.list(query);
  }

  @Get('licenses')
  @Public()
  @ApiOperation({ summary: 'Licences accepted for imported assets' })
  licenses() {
    return LIBRARY_LICENSES;
  }

  @Get('assets/manage')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Admin: every asset, hidden ones included' })
  manage(@Query() query: QueryLibraryDto) {
    return this.library.list(query, true);
  }

  @Post('assets')
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Admin: import one of your uploads into the library',
    description:
      'Upload the file first (POST /storage/presigned-upload, purpose LOGO or IMAGE). Refused (400): licence without the ' +
      'required credit (ATTRIBUTION_REQUIRED), unsafe SVG or raster too small to print 50 mm at 300 DPI (LIBRARY_FILE_REFUSED).',
  })
  create(@CurrentUser('id') adminId: string, @Body() dto: CreateLibraryAssetDto) {
    return this.library.create(adminId, dto);
  }

  @Patch('assets/:id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Admin: edit an asset or hide it (isActive: false)' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateLibraryAssetDto) {
    return this.library.update(id, dto);
  }
}
