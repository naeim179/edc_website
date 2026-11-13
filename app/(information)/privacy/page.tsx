import InformationPage from "@/components/InformationPage";
import { informationPages } from "@/lib/site-information";

export const metadata = { title: `${informationPages["privacy"].title.ar} | ${informationPages["privacy"].title.en} | YOUR WAY ACADEMY` };

export default function Page() {
  return <InformationPage pageId="privacy" />;
}
