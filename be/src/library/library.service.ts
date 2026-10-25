import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { LibraryAsset, Prisma } from '@prisma/client';
import { paginate, Paginated, toSkipTake } from '../common';
import { PrismaService } from '../shared/prisma';
import { assetUrl, StorageService } from '../storage';
import { CreateLibraryAssetDto, QueryLibraryDto, UpdateLibraryAssetDto } from './dto/library.dto';
import { inspectLibraryFile, LIBRARY_LICENSES, LibraryFileError } from './library-file.rules';

/** What the studio shows of an asset: no storage key, its public URL instead. */
const present = ({ fileKey, storedFileId: _file, createdById: _by, ...asset }: LibraryAsset) => ({
  ...asset,
  url: assetUrl(fileKey),
});
export type LibraryAssetView = ReturnType<typeof present>;

/**
 * Shared library of imported assets (stickers, illustrations, backgrounds…). Admins import uploads they made, each
 * checked (licence, safe SVG, resolution); everyone lists the active ones. Simple module: Service -> Prisma + storage.
 */
@Injectable()
export class LibraryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  /** Active assets, newest first. `all` (admins) also lists the hidden ones. */
  async list(query: QueryLibraryDto, all = false): Promise<Paginated<LibraryAssetView>> {
    const where: Prisma.LibraryAssetWhereInput = {
      ...(all ? {} : { isActive: true }),
      category: query.category,
      ...(query.occasion && { occasions: { has: query.occasion } }),
      ...(query.q && {
        OR: [{ title: { contains: query.q, mode: 'insensitive' } }, { tags: { has: query.q.toLowerCase() } }],
      }),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.libraryAsset.findMany({ where, orderBy: { createdAt: 'desc' }, ...toSkipTake(query) }),
      this.prisma.libraryAsset.count({ where }),
    ]);
    return paginate(rows.map(present), total, query);
  }

  /** Imports an upload of the admin: checks the licence, then the file itself (SVG safety, print resolution). */
  async create(adminId: string, dto: CreateLibraryAssetDto): Promise<LibraryAssetView> {
    this.assertAttribution(dto.license, dto.attribution);
    const key = await this.storage.resolveUpload(dto.fileUrl, adminId, ['LOGO', 'IMAGE']);
    const stored = await this.prisma.storedFile.findUnique({ where: { key }, select: { id: true, library: { select: { id: true } } } });
    if (!stored) throw new NotFoundException('Upload not found');
    if (stored.library) throw new BadRequestException({ code: 'LIBRARY_FILE_EXISTS', message: 'File này đã có trong thư viện' });
    const file = await this.storage.getObject(key);
    let inspected;
    try {
      inspected = await inspectLibraryFile(file);
    } catch (error) {
      if (error instanceof LibraryFileError) throw new BadRequestException({ code: 'LIBRARY_FILE_REFUSED', message: error.message });
      throw error;
    }
    const asset = await this.prisma.libraryAsset.create({
      data: {
        category: dto.category,
        title: dto.title,
        storedFileId: stored.id,
        fileKey: key,
        contentType: file.contentType,
        ...inspected,
        license: dto.license,
        sourceUrl: dto.sourceUrl ?? null,
        attribution: dto.attribution ?? null,
        tags: (dto.tags ?? []).map((tag) => tag.trim().toLowerCase()).filter(Boolean),
        occasions: dto.occasions ?? [],
        createdById: adminId,
      },
    });
    return present(asset);
  }

  async update(id: string, dto: UpdateLibraryAssetDto): Promise<LibraryAssetView> {
    const current = await this.prisma.libraryAsset.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('Library asset not found');
    this.assertAttribution(dto.license ?? current.license, dto.attribution === undefined ? current.attribution : dto.attribution);
    const asset = await this.prisma.libraryAsset.update({
      where: { id },
      data: {
        ...dto,
        ...(dto.tags && { tags: dto.tags.map((tag) => tag.trim().toLowerCase()).filter(Boolean) }),
      },
    });
    return present(asset);
  }

  private assertAttribution(license: string, attribution: string | null | undefined) {
    const needs = LIBRARY_LICENSES.find((l) => l.id === license)?.attribution;
    if (needs && !attribution?.trim()) {
      throw new BadRequestException({ code: 'ATTRIBUTION_REQUIRED', message: `Giấy phép ${license} bắt buộc ghi nguồn tác giả` });
    }
  }
}
