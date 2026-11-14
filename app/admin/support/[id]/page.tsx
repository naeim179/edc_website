import { notFound } from "next/navigation";
import AppShell from "@/components/AppShell";
import SupportFailure from "@/components/support/SupportFailure";
import SupportDetailView from "@/components/support/SupportDetailView";
import { getSupportTicket } from "@/app/actions/support";
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
 const { id } = await params; const result = await getSupportTicket(id,true);
 if (!result.ok) {
  if (result.error === "unauthorized" || result.error === "invalid") notFound();
  return <AppShell><SupportFailure error={result.error} staff={true} /></AppShell>;
 }
 return <AppShell><SupportDetailView staff initial={result.data} /></AppShell>;
}
