import type { Metadata } from "next";
import type { ReactNode } from "react";
import { requireSupportUser } from "@/lib/support/server";
import "../support.css";
export const metadata: Metadata = { title: "الدعم والشكاوى | YOUR WAY ACADEMY", robots: { index: false,follow: false } };
export default async function Layout({ children }: { children: ReactNode }) { await requireSupportUser(); return children; }
