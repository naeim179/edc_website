import type { Metadata } from "next";
import type { ReactNode } from "react";
import { requireSupportUser } from "@/lib/support/server";
import "../../support.css";
export const metadata: Metadata = { title: "إدارة الشكاوى | YOUR WAY ACADEMY", robots: { index: false,follow: false } };
export default async function Layout({ children }: { children: ReactNode }) { await requireSupportUser(true); return children; }
