import { siteConfig } from "../config/site";
import {
  DEFAULT_SECTION_ORDER,
  NICHE_DEFAULT_SECTION_ORDER,
} from "../config/presets/themes";
import type { LandingSectionId } from "../types";

/**
 * Effective landing section order: Firestore override > niche default > global default.
 * Mirrors the resolution in App.tsx — a section can only render if its id is here.
 */
export function effectiveSectionOrder(): LandingSectionId[] {
  return (
    siteConfig.sectionOrder ??
    NICHE_DEFAULT_SECTION_ORDER[siteConfig.business.type] ??
    DEFAULT_SECTION_ORDER
  );
}

/**
 * True when the landing section is part of the effective section order.
 * Navbars/footers must AND this with the feature flag before emitting an
 * anchor link — a flag can be true while the niche order omits the section
 * (e.g. cafeteria has no "services", remodelaciones has no "team"), which
 * otherwise produces dead `#section` links.
 */
export function landingSectionPresent(id: LandingSectionId): boolean {
  return effectiveSectionOrder().includes(id);
}
