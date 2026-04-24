import type { LucideIcon } from "lucide-react";
import {
  Award,
  Clock,
  HeartHandshake,
  HelpCircle,
  Microscope,
  Palette,
  Pen,
  Scale,
  Scissors,
  ShieldCheck,
  Sparkles,
  Star,
  Users,
  Zap,
} from "lucide-react";

/**
 * Icons referenced by string name from site config (`logoIconName`, benefit `iconName`).
 * Keep this map in sync with presets and tenant overrides — avoids `import * as Icons`
 * which pulls the entire lucide-react bundle into the client.
 */
const ICONS: Record<string, LucideIcon> = {
  Award,
  Clock,
  HeartHandshake,
  HelpCircle,
  Microscope,
  Palette,
  Pen,
  Scale,
  Scissors,
  ShieldCheck,
  Sparkles,
  Star,
  Users,
  Zap,
};

export function resolveLucideIcon(name: string | undefined, fallback: LucideIcon): LucideIcon {
  if (!name || typeof name !== "string") return fallback;
  return ICONS[name] ?? fallback;
}
