// Legacy URL — redirect to /projects/[id]/dia/2 so any existing
// bookmarks (the v1 Capítulo 2 editor lived here) keep working.
import { redirect } from "next/navigation";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function LegacyCap2Page({ params }: PageProps) {
  const { id } = await params;
  redirect(`/projects/${id}/dia/2`);
}
