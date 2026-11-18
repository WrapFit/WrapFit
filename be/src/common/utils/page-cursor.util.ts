import { BadRequestException } from '@nestjs/common';
import { ValidateBy, type ValidationOptions } from 'class-validator';

/**
 * Cursor of a list sorted newest first by `(created_at, id)` (`nextBefore` in the response, `before` in the query): the
 * last row of the previous page. Rows created in the same millisecond are told apart by their id, so a page boundary
 * between two of them skips neither.
 */
export interface PageCursor {
  createdAt: Date;
  /** Missing in a cursor of the former shape, a bare date. */
  id?: string;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_CURSOR_LENGTH = 80;

/** `<ISO date>_<id>` of the last row of a page. */
export function encodePageCursor(row: { createdAt: Date; id: string }): string {
  return `${row.createdAt.toISOString()}_${row.id}`;
}

/**
 * Reads a `before` value: `<ISO date>_<uuid>`, or a bare date, the cursor the API sent before 2026-11-16 and a client
 * may still hold (read as it was then: rows strictly older). null when it is neither.
 */
export function parsePageCursor(value: string): PageCursor | null {
  if (value.length > MAX_CURSOR_LENGTH) return null;
  const [date, id, ...rest] = value.split('_');
  if (rest.length > 0 || (id !== undefined && !UUID.test(id))) return null;
  const createdAt = new Date(date);
  if (!date || Number.isNaN(createdAt.getTime())) return null;
  return id === undefined ? { createdAt } : { createdAt, id: id.toLowerCase() };
}

/**
 * Prisma `where` for the rows after `before` in `ORDER BY created_at DESC, id DESC`; nothing when `before` is omitted.
 * An invalid value answers 400 (the DTO refuses it first with `@IsPageCursor`).
 */
export function olderThan(before: string | undefined) {
  if (!before) return {};
  const cursor = parsePageCursor(before);
  if (!cursor) throw new BadRequestException('before must be the nextBefore of the previous page');
  if (!cursor.id) return { createdAt: { lt: cursor.createdAt } };
  // `lte` bounds the index range scan; the OR keeps, inside the cursor's millisecond, only the rows after its id.
  return {
    createdAt: { lte: cursor.createdAt },
    OR: [{ createdAt: { lt: cursor.createdAt } }, { id: { lt: cursor.id } }],
  };
}

/** Validates a `before` query parameter: a `nextBefore` of this API, current or former shape. */
export function IsPageCursor(options?: ValidationOptions): PropertyDecorator {
  return ValidateBy(
    {
      name: 'isPageCursor',
      validator: {
        validate: (value: unknown) => typeof value === 'string' && parsePageCursor(value) !== null,
        defaultMessage: () => '$property must be the nextBefore of the previous page',
      },
    },
    options,
  );
}
