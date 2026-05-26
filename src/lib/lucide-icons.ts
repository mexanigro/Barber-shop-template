import type { LucideIcon } from "lucide-react";
import {
  Award,
  Brush,
  Clock,
  Coffee,
  Croissant,
  Crown,
  Diamond,
  Droplet,
  Flower2,
  Gem,
  Hammer,
  HardHat,
  Heart,
  HeartHandshake,
  HelpCircle,
  Home,
  Leaf,
  Microscope,
  Palette,
  PaintBucket,
  Paintbrush,
  Pen,
  Ruler,
  Scale,
  Scissors,
  ShieldCheck,
  Sparkles,
  Star,
  Syringe,
  Stethoscope,
  Users,
  Wrench,
  Zap,
} from "lucide-react";

/**
 * Icons referenced by string name from site config (`logoIconName`, benefit `iconName`).
 * Keep this map in sync with presets and tenant overrides — avoids `import * as Icons`
 * which pulls the entire lucide-react bundle into the client.
 *
 * New entries should be grouped by niche so it's obvious which icons are reachable
 * from which preset / Firestore override.
 */
const ICONS: Record<string, LucideIcon> = {
  // Generic / shared
  Award,
  Clock,
  HeartHandshake,
  HelpCircle,
  Heart,
  Microscope,
  Palette,
  Pen,
  Scale,
  ShieldCheck,
  Sparkles,
  Star,
  Users,
  Zap,
  Crown,
  Leaf,
  Diamond,

  // Barberia
  Scissors,

  // Cafeteria
  Coffee,
  Croissant,

  // Estetica
  Stethoscope,
  Syringe,
  Droplet,

  // Nails
  Flower2,
  Gem,

  // Remodelaciones / pintureria
  Brush,
  Hammer,
  HardHat,
  Home,
  PaintBucket,
  Paintbrush,
  Ruler,
  Wrench,
};

export function resolveLucideIcon(name: string | undefined, fallback: LucideIcon): LucideIcon {
  if (!name || typeof name !== "string") return fallback;
  return ICONS[name] ?? fallback;
}
