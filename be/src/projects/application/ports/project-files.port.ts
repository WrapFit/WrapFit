export const PROJECT_FILES = Symbol('PROJECT_FILES');

/** Same values as the Prisma enum FilePurpose (uploads only). */
export type UploadPurpose = 'LOGO' | 'IMAGE' | 'THUMBNAIL' | 'AVATAR' | 'FONT';

export interface ProjectFile {
  projectId: string;
  key: string;
}

/** Files of projects in object storage (implemented by StorageService). */
export interface IProjectFiles {
  /**
   * Removes objects from the bucket. Never throws. A permanent deletion passes the keys the repository listed in its
   * transaction (shared files handed over to the projects that still show them, the others listed), after the commit.
   */
  deleteObjects(keys: string[]): Promise<void>;
  /** Key of an upload URL of `userId` for one of `purposes`; 400 FILE_URL_NOT_ALLOWED / FILE_NOT_OWNED otherwise. */
  resolveUpload(url: string, userId: string, purposes: UploadPurpose[]): Promise<string>;
  /** 400 FILE_NOT_OWNED when a canvas adds an upload of someone else (`alreadyShown` keys are allowed). */
  assertCanvasUploads(keys: string[], userId: string, alreadyShown: string[]): Promise<void>;
}
