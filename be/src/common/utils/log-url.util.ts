/** Public design review links (`/api/review/<token>`, docs-old/23 S23): the token is the only secret of the link. */
const REVIEW_TOKEN = /(\/api\/review\/)([^/?#]{0,4})[^/?#]*/;

/**
 * The URL of a request as it may be written to a log: a review link token keeps its first 4 characters (enough to
 * match log lines of one link) and the rest is masked, so a log reader cannot open the link.
 */
export function loggableUrl(url: string): string {
  return url.replace(REVIEW_TOKEN, '$1$2***');
}
