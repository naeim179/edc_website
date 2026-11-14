import AppShell from "@/components/AppShell";
import SupportListView from "@/components/support/SupportListView";
import { listSupportTickets } from "@/app/actions/support";
export default async function Page() { return <AppShell><SupportListView initial={await listSupportTickets(false)} /></AppShell>; }
