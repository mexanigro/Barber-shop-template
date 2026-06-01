import { siteConfig } from "../../config/site";
import { AuraBeforeAfter } from "./aura/aura-before-after";

export function BeforeAfterSection() {
  const cases = siteConfig.sections.beforeAfter?.cases;
  if (!cases?.length) return null;
  return <AuraBeforeAfter />;
}
