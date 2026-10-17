import { redirect } from "next/navigation";
import { mainLoginUrl } from "@/lib/main-login";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Keep old bookmarks working while sharing the CMS account page.
export default async function LoginPage({ searchParams }: {
  searchParams: Promise<{ redirect?: string | string[]; next?: string | string[]; mode?: string | string[] }>;
}) {
  const query = await searchParams;
  const returnTo = typeof query.redirect === "string" ? query.redirect : typeof query.next === "string" ? query.next : null;
  redirect(mainLoginUrl(returnTo, query.mode === "signup"));
}
