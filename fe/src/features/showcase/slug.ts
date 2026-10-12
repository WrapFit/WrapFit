/**
 * Shape of a public slug (`/p/<slug>`, `/unbox/<slug>`), the same check as the API's SlugPipe. Anything else is
 * answered "not found" without calling the API, and never ends up in a request path (`../`, `?`, `#`).
 */
export function isShareSlug(value: string | null | undefined): value is string {
  return typeof value === "string" && /^[\w-]{1,32}$/.test(value);
}

/** Slug typed by a visitor: a bare code or any link that ends in `/unbox/<slug>`. */
export function unboxSlugFrom(input: string): string | null {
  const value = input.trim();
  const fromLink = /\/unbox\/([\w-]{1,32})\/?(?:[?#].*)?$/.exec(value)?.[1];
  const slug = fromLink ?? value;
  return isShareSlug(slug) ? slug : null;
}
