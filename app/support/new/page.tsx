import AppShell from "@/components/AppShell";
import SupportNewForm from "@/components/support/SupportNewForm";
import { getSupportOptions } from "@/lib/support/server";
export default async function Page() { return <AppShell><SupportNewForm options={await getSupportOptions()} /></AppShell>; }
