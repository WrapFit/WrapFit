/**
 * Active time in the studio (docs/17, decision M8): the "box creation time" of the dashboard counts only the time a
 * user is working on the design, not the days a project waits in between.
 *
 * The studio sends a heartbeat every minute with the seconds of activity since the previous one. Time between two
 * actions counts when they are at most STUDIO_IDLE_GAP_MS apart; a longer break (lunch, another tab, the next day)
 * counts nothing.
 */

/** A break longer than this between two actions is not working time. */
export const STUDIO_IDLE_GAP_MS = 2 * 60 * 1000;
/** The studio sends its activity this often. */
export const STUDIO_HEARTBEAT_MS = 60 * 1000;
/** Seconds one heartbeat may report (the API refuses more). */
export const MAX_STUDIO_HEARTBEAT_SECONDS = 60;

/** Working time an action at `actionAt` adds after the previous action (ms since the epoch, or null for the first). */
export function activeGapMs(previousActionAt: number | null, actionAt: number, idleGapMs = STUDIO_IDLE_GAP_MS): number {
  if (previousActionAt === null) return 0;
  const gap = actionAt - previousActionAt;
  return gap > 0 && gap <= idleGapMs ? gap : 0;
}

/** Working time of a series of action times, breaks longer than `idleGapMs` left out. */
export function activeTimeMs(actionTimes: readonly number[], idleGapMs = STUDIO_IDLE_GAP_MS): number {
  const sorted = [...actionTimes].sort((a, b) => a - b);
  let total = 0;
  for (let i = 1; i < sorted.length; i++) total += activeGapMs(sorted[i - 1], sorted[i], idleGapMs);
  return total;
}
