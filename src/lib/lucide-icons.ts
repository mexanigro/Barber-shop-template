import type { LucideIcon } from "lucide-react";
import {
  Award,
  Briefcase,
  Brush,
  Calendar,
  Car,
  CheckCircle,
  ChefHat,
  ClipboardList,
  Clock,
  Coffee,
  Croissant,
  Crown,
  Diamond,
  Droplet,
  Droplets,
  Flame,
  Flower2,
  Gem,
  Globe,
  Hammer,
  HardHat,
  Headphones,
  Heart,
  HeartHandshake,
  HelpCircle,
  Home,
  Layers,
  Leaf,
  MapPin,
  MessageCircle,
  Microscope,
  Package,
  Palette,
  PaintBucket,
  Paintbrush,
  Pen,
  PenTool,
  Plus,
  Rocket,
  Ruler,
  Scale,
  Scissors,
  Shield,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Star,
  Sun,
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
  Calendar,
  Clock,
  HeartHandshake,
  HelpCircle,
  Heart,
  Microscope,
  Palette,
  Pen,
  Scale,
  Shield,
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
  Flame,
  Sun,

  // Estetica
  Stethoscope,
  Syringe,
  Droplet,

  // Nails
  Flower2,
  Gem,

  // Tattoo
  PenTool,

  // Remodelaciones / pintureria
  Brush,
  CheckCircle,
  Droplets,
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
  ClipboardList,
  Globe,
  Headphones,
  Layers,
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
