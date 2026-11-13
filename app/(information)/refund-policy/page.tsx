import InformationPage from "@/components/InformationPage";
import { informationPages } from "@/lib/site-information";

export const metadata = { title: `${informationPages["refund-policy"].title.ar} | ${informationPages["refund-policy"].title.en} | YOUR WAY ACADEMY` };

export default function Page() {
  return <InformationPage pageId="refund-policy" />;
}
