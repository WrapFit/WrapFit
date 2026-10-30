export const PROJECT_EVENTS = Symbol('PROJECT_EVENTS');

/** How a project came to be: created in the studio or from a template, duplicated, or remixed from someone else. */
export type ProjectSource = 'new' | 'duplicate' | 'fork';

/** Product events of the analytics dashboard (implemented by ProductEventsService). Recording never throws. */
export interface IProjectEvents {
  record(
    type: 'PROJECT_CREATED',
    event: { userId: string; projectId: string; payload: { templateId: string; source: ProjectSource } },
  ): Promise<void>;
  record(type: 'AUTO_FIX_APPLIED', event: { userId: string; projectId: string; payload: { fixed: number } }): Promise<void>;
  /** Studio heartbeat; false when the same project sent one less than a minute ago (counted once). */
  recordStudioActivity(userId: string, projectId: string, seconds: number): Promise<boolean>;
}
