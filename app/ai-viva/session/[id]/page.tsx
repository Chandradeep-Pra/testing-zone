import AuthenticatedVivaSessionLoader from "@/components/ai-viva/AuthenticatedVivaSessionLoader";

export default async function VivaSessionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <AuthenticatedVivaSessionLoader id={id} />;
}
