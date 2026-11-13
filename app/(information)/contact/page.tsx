import InformationPage from "@/components/InformationPage";
import { informationPages } from "@/lib/site-information";

export const metadata = { title: `${informationPages["contact"].title.ar} | ${informationPages["contact"].title.en} | YOUR WAY ACADEMY` };

export default function Page() {
  return <InformationPage pageId="contact" />;
}
