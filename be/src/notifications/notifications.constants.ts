/**
 * Redis pub/sub channel between the processes that create notifications and the API process that holds the browsers'
 * sockets. The message is the recipient's user id; the inbox itself is always read from PostgreSQL.
 */
export const NOTIFICATIONS_CHANNEL = 'wrapfit:notifications';

/** Socket.IO event sent to `user:<id>` when that user's inbox changed: the frontend refetches the unread count. */
export const NOTIFICATIONS_CHANGED = 'notifications.changed';

/** Read notifications are deleted this long after they were created (daily AuthMaintenanceTask). */
export const READ_NOTIFICATION_RETENTION_DAYS = 30;

/** Newest rows kept per user, read or not; older ones are deleted by the same daily task. */
export const MAX_NOTIFICATIONS_PER_USER = 200;

/** Page size of `GET /notifications`. */
export const NOTIFICATION_PAGE_DEFAULT = 20;
export const NOTIFICATION_PAGE_MAX = 50;
