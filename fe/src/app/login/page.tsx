import { redirect } from "next/navigation";
import { ROUTES } from "@/constants";
import { toQueryString } from "@/views/account/shared/query";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/**
 * `/login` is the address the backend knows: failed Google sign-ins come back to `/login?error=google_*`
 * (docs/06, 3.1). The form lives at `/auth/login`; the whole query string goes along.
 */
export default async function LoginRedirect({ searchParams }: { searchParams: SearchParams }) {
  redirect(`${ROUTES.login}${toQueryString(await searchParams)}`);
}
