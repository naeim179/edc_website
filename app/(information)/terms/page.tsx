import InformationPage from "@/components/InformationPage";
import { informationPages } from "@/lib/site-information";

export const metadata = { title: `${informationPages["terms"].title.ar} | ${informationPages["terms"].title.en} | YOUR WAY ACADEMY` };

export default function Page() {
  return <InformationPage pageId="terms" />;
}
