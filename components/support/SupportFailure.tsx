"use client";
import Link from "next/link";
import { LifeBuoy } from "lucide-react";
import { useSupportCopy } from "./SupportShared";
import type { SupportError } from "@/lib/support/types";
export default function SupportFailure({ error,staff }: { error: SupportError; staff: boolean }) {
 const { s } = useSupportCopy();
 return <div className="support-workspace support-panel support-empty"><LifeBuoy size={32} /><h1>{s.failed}</h1><p role="alert">{s.errors[error]}</p><Link className="support-button" href={staff ? "/admin/support" : "/support"}>{s.back}</Link></div>;
}
