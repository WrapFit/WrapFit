import { activeGapMs, activeTimeMs, STUDIO_IDLE_GAP_MS } from '@wrapfit/shared';
import {
  boxTypesOf,
  countsByDay,
  creationTimeOf,
  mean,
  median,
  periodOf,
  vietnamDate,
} from './analytics-stats';

describe('analytics stats', () => {
  describe('median', () => {
    it('takes the middle value of an odd count, whatever the order', () => {
      expect(median([300, 60, 1200])).toBe(300);
    });

    it('takes the mean of the two middle values of an even count', () => {
      expect(median([60, 240, 120, 600])).toBe(180);
    });

    it('is not pulled by one project left open for hours, unlike the mean', () => {
      const seconds = [240, 300, 360, 420, 36_000];
      expect(median(seconds)).toBe(360);
      expect(mean(seconds)).toBe(7464);
    });

    it('is null without values', () => {
      expect(median([])).toBeNull();
      expect(mean([])).toBeNull();
    });
  });

  describe('creation time', () => {
    it('rounds to whole seconds and leaves out projects without studio activity (older data)', () => {
      expect(creationTimeOf([0, 125, 250])).toEqual({
        medianSeconds: 188,
        meanSeconds: 188,
        projects: 2,
      });
      expect(creationTimeOf([])).toEqual({
        medianSeconds: null,
        meanSeconds: null,
        projects: 0,
      });
    });
  });

  describe('active studio time (breaks over 2 minutes left out)', () => {
    const minute = 60_000;

    it('counts the time between two actions up to 2 minutes apart', () => {
      expect(activeGapMs(0, 90_000)).toBe(90_000);
      expect(activeGapMs(0, STUDIO_IDLE_GAP_MS)).toBe(STUDIO_IDLE_GAP_MS);
    });

    it('counts nothing for a longer break, the first action or a clock going back', () => {
      expect(activeGapMs(0, STUDIO_IDLE_GAP_MS + 1)).toBe(0);
      expect(activeGapMs(null, 5_000)).toBe(0);
      expect(activeGapMs(10_000, 5_000)).toBe(0);
    });

    it('adds up a session and drops the lunch break in the middle', () => {
      // 10 minutes of work with an action every minute, 1 hour away, then 3 more minutes.
      const morning = Array.from({ length: 11 }, (_, i) => i * minute);
      const afternoon = [70, 71, 72, 73].map((m) => m * minute);
      expect(activeTimeMs([...afternoon, ...morning])).toBe(13 * minute);
    });
  });

  describe('period', () => {
    it('ends today in Vietnam time and starts at midnight there', () => {
      // 18:30 UTC on 29 October is already 01:30 on 30 October in Vietnam.
      const period = periodOf(7, new Date('2026-10-29T18:30:00Z'));
      expect(period.to).toBe('2026-10-30');
      expect(period.from).toBe('2026-10-24');
      expect(period.start.toISOString()).toBe('2026-10-23T17:00:00.000Z');
      expect(period.dates).toHaveLength(7);
      expect(vietnamDate(new Date('2026-10-23T16:59:59Z'))).toBe('2026-10-23');
    });

    it('fills days without boxes with 0 and merges rows of the same day', () => {
      const { dates } = periodOf(3, new Date('2026-10-29T05:00:00Z'));
      expect(
        countsByDay(dates, [
          { day: '2026-10-27', count: 2 },
          { day: '2026-10-29', count: 1 },
          { day: '2026-10-29', count: 3 },
        ]),
      ).toEqual([
        { date: '2026-10-27', count: 2 },
        { date: '2026-10-28', count: 0 },
        { date: '2026-10-29', count: 4 },
      ]);
    });
  });

  it('lists the four box structures in a fixed order and other structures last', () => {
    expect(
      boxTypesOf([
        { templateId: 'pillow', count: 1 },
        { templateId: 'tuck-top', count: 3 },
        { templateId: 'tuck-top', count: 2 },
        { templateId: 'sticker-label', count: 1 },
        { templateId: null, count: 1 },
      ]),
    ).toEqual([
      { type: 'tuck-top', count: 5 },
      { type: 'sleeve-drawer', count: 0 },
      { type: 'lid-base', count: 0 },
      { type: 'pillow', count: 1 },
      { type: 'other', count: 2 },
    ]);
    expect(boxTypesOf([])).toHaveLength(4);
  });
});
