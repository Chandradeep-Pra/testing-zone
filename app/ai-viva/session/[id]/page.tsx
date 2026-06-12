import { notFound } from "next/navigation";

import VivaSessionClient from "@/components/ai-viva/VivaSessionClient";
import {
  fetchRemotePublicVivaCaseById,
  fetchRemoteVivaCaseById,
  getDefaultVivaCase,
} from "@/lib/viva-case";

export default async function VivaSessionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  let vivaCase = null;

  try {
    vivaCase = await fetchRemoteVivaCaseById(id);
  } catch (error) {
    console.error("Failed to load viva case:", error);
  }

  if (!vivaCase) {
    try {
      vivaCase = await fetchRemotePublicVivaCaseById(id);
    } catch (error) {
      console.error("Failed to load public viva case:", error);
    }
  }

  if (!vivaCase) {
    const fallback = getDefaultVivaCase();
    vivaCase = id === fallback.id ? fallback : null;
  }

  if (!vivaCase) {
    notFound();
  }

  return <VivaSessionClient vivaCase={vivaCase} />;
}
