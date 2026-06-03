import type { LucideIcon } from "lucide-react";
import {
  Award,
  Briefcase,
  Brush,
  Car,
  ChefHat,
  Clock,
  Coffee,
  Croissant,
  Crown,
  Diamond,
  Droplet,
  Flower2,
  Gem,
  Globe,
  Hammer,
  HardHat,
  Heart,
  HeartHandshake,
  HelpCircle,
  Home,
  Leaf,
  MapPin,
  MessageCircle,
  Microscope,
  Package,
  Palette,
  PaintBucket,
  Paintbrush,
  Pen,
  Plus,
  Rocket,
  Ruler,
  Scale,
  Scissors,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Star,
  Syringe,
  Stethoscope,
  Truck,
  UserPlus,
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

  // Employment
  Briefcase,
  Car,
  ChefHat,
  Globe,
  MapPin,
  MessageCircle,
  Package,
  Plus,
  Rocket,
  ShoppingCart,
  Truck,
  UserPlus,
};

export function resolveLucideIcon(name: string | undefined, fallback: LucideIcon): LucideIcon {
  if (!name || typeof name !== "string") return fallback;
  return ICONS[name] ?? fallback;
}
