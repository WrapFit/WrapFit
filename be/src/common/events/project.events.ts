/**
 * Internal events (`@nestjs/event-emitter`). Listeners (`@OnEvent`) run asynchronously and must not
 * throw back into the request that emitted the event. NotificationsListener stores a notification for the author.
 */
export const PROJECT_FORKED = 'project.forked';

export interface ProjectForkedEvent {
  /** The public project that was remixed. */
  sourceProjectId: string;
  /** Its author: the user to notify (never the remixer, see PublicProjectsService.fork). */
  sourceOwnerId: string;
  /** The new project created in the remixer's workspace. */
  forkProjectId: string;
  forkedById: string;
}
