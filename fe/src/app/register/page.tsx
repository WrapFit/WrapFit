import { redirect } from "next/navigation";
import { ROUTES } from "@/constants";
import { toQueryString } from "@/views/account/shared/query";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/** Short address of the sign-up form (docs/06, 3.1), which lives at `/auth/register`. Keeps the query string. */
export default async function RegisterRedirect({ searchParams }: { searchParams: SearchParams }) {
  redirect(`${ROUTES.register}${toQueryString(await searchParams)}`);
}
