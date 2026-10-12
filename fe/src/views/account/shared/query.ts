/** Query string helpers of the account pages. No "use client": the `/login` and `/register` redirects use them too. */

type SearchParamsRecord = Record<string, string | string[] | undefined>;

/** `?a=1&b=2` from Next's `searchParams` (repeated keys kept), or "" when there is nothing to keep. */
export function toQueryString(params: SearchParamsRecord): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    for (const item of [value ?? []].flat()) query.append(key, item);
  }
  const search = query.toString();
  return search ? `?${search}` : "";
}

/** `path?email=…` when an address is known, else `path`. */
export function withEmail(path: string, email: string | null | undefined): string {
  const value = email?.trim();
  return value ? `${path}?email=${encodeURIComponent(value)}` : path;
}
