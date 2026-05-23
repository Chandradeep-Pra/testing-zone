import { notFound } from "next/navigation";

import PublicVivaSessionClient from "@/components/ai-viva/PublicVivaSessionClient";
import { fetchRemotePublicVivaCaseById } from "@/lib/viva-case";

export default async function PublicVivaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const vivaCase = await fetchRemotePublicVivaCaseById(id);

  if (!vivaCase) {
    notFound();
  }

  return <PublicVivaSessionClient vivaCase={vivaCase} />;
}
