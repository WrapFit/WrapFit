import { BadRequestException } from '@nestjs/common';
import { encodePageCursor, olderThan, parsePageCursor } from './page-cursor.util';

describe('page cursor', () => {
  const createdAt = new Date('2026-11-16T03:04:05.678Z');
  const id = '019a8c1e-0000-7000-8000-00000000000a';

  it('round-trips the date and id of the last row', () => {
    const cursor = encodePageCursor({ createdAt, id });
    expect(cursor).toBe(`2026-11-16T03:04:05.678Z_${id}`);
    expect(parsePageCursor(cursor)).toEqual({ createdAt, id });
  });

  it('still reads a bare date, the cursor of the former API, as "strictly older"', () => {
    expect(parsePageCursor('2026-11-16T03:04:05.678Z')).toEqual({ createdAt });
    expect(olderThan('2026-11-16T03:04:05.678Z')).toEqual({ createdAt: { lt: createdAt } });
  });

  it('keeps the rows of the same millisecond after the id', () => {
    expect(olderThan(encodePageCursor({ createdAt, id }))).toEqual({
      createdAt: { lte: createdAt },
      OR: [{ createdAt: { lt: createdAt } }, { id: { lt: id } }],
    });
    expect(olderThan(undefined)).toEqual({});
  });

  it('refuses anything else with 400', () => {
    for (const bad of ['nope', `${createdAt.toISOString()}_not-a-uuid`, `${createdAt.toISOString()}_${id}_x`, `x_${id}`, '_']) {
      expect(parsePageCursor(bad)).toBeNull();
      expect(() => olderThan(bad)).toThrow(BadRequestException);
    }
    expect(parsePageCursor('9'.repeat(81))).toBeNull();
  });
});
