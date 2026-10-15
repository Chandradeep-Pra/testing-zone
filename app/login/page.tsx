import { redirect } from "next/navigation";
import { mainLoginUrl } from "@/lib/main-login";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Keep old bookmarks working while sharing the CMS account page.
export default async function LoginPage({ searchParams }: {
  searchParams: Promise<{ redirect?: string; next?: string; mode?: string }>;
}) {
  const query = await searchParams;
  redirect(mainLoginUrl(query.redirect ?? query.next ?? null, query.mode === "signup"));
}
