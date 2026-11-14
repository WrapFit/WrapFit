import { Body, Controller, Get, Param, ParseIntPipe, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
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
  @ApiOperation({
    summary: 'Stock photos (Pexels) for the studio, searched through the backend',
    description: 'Answers { enabled: false, items: [] } when PEXELS_API_KEY is not set; 502 STOCK_PROVIDER_ERROR when Pexels fails.',
  })
  searchStock(@Query() query: SearchStockPhotosDto) {
    return this.stock.search(query);
  }

  @Post('stock/photos/:id/import')
  @ApiOperation({
    summary: 'Copy a stock photo into your files to place it on a design',
    description:
      'The photo is downloaded once and stored as one of your IMAGE uploads (print files never depend on an outside link); ' +
      'the answer carries the credit to show. 503 STOCK_UNAVAILABLE without a key.',
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
