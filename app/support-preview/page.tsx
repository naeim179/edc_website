import { notFound } from "next/navigation";
import SupportPreview from "@/components/support/SupportPreview";
import "../support.css";
export const metadata = { title: "معاينة الدعم والشكاوى", robots: { index: false,follow: false } };
export default function Page() {
 if (process.env.NODE_ENV === "production") notFound();
 return <SupportPreview />;
}
