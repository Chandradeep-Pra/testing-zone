import { notFound } from "next/navigation";

import VivaSessionClient from "@/components/ai-viva/VivaSessionClient";
import { fetchRemoteVivaCaseById } from "@/lib/viva-case";

export default async function VivaSessionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const vivaCase = await fetchRemoteVivaCaseById(id);

  if (!vivaCase) {
    notFound();
  }

  return <VivaSessionClient vivaCase={vivaCase} />;
}
