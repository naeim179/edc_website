import type { Metadata } from "next";
import type { ReactNode } from "react";

// Keep the incomplete merchant information and policy drafts out of search results.
export const metadata: Metadata = {
  title: "YOUR WAY ACADEMY | معلومات المنصة",
  robots: { index: false, follow: true },
};

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
