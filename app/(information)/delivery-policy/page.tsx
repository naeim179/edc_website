import InformationPage from "@/components/InformationPage";
import { informationPages } from "@/lib/site-information";

export const metadata = { title: `${informationPages["delivery-policy"].title.ar} | ${informationPages["delivery-policy"].title.en} | YOUR WAY ACADEMY` };

export default function Page() {
  return <InformationPage pageId="delivery-policy" />;
}
