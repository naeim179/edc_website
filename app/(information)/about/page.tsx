import InformationPage from "@/components/InformationPage";
import { informationPages } from "@/lib/site-information";

export const metadata = { title: `${informationPages["about"].title.ar} | ${informationPages["about"].title.en} | YOUR WAY ACADEMY` };

export default function Page() {
  return <InformationPage pageId="about" />;
}
