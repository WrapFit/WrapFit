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

/**
 * A project was saved through PATCH /projects/:id (design, name, tags...; a thumbnail alone does not count). The
 * WebSocket gateway tells the owner's other editor tabs, which load the save (docs/18 Q5).
 */
export const PROJECT_SAVED = 'project.saved';

/** Header the editor sends with its saves: an id of the browser tab, echoed so that tab ignores its own save. */
export const EDITOR_TAB_HEADER = 'x-wf-tab';

export interface ProjectSavedEvent {
  /** The owner: the only user who can edit the project. */
  userId: string;
  projectId: string;
  /** Version after the save (unchanged by a save of the name or tags alone). */
  version: number;
  updatedAt: string;
  /** EDITOR_TAB_HEADER of the save, null when absent or malformed. */
  tabId: string | null;
}
