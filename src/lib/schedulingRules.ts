import { siteConfig } from "../config/site";
import { SCHEDULING_CONFIG, DEFAULT_BUSINESS_RULES } from "../constants";
import type { BusinessRules } from "../types";

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

/** Effective scheduling rules: Firestore overlay + defaults (never read at module scope before bootstrap). */
export function getEffectiveBusinessRules(): Required<BusinessRules> {
  const br = siteConfig.businessRules;
  return {
    bufferMinutes:
      typeof br?.bufferMinutes === "number"
        ? clamp(br.bufferMinutes, 0, 120)
        : DEFAULT_BUSINESS_RULES.bufferMinutes,
    maxAdvanceBookingDays:
      typeof br?.maxAdvanceBookingDays === "number"
        ? clamp(br.maxAdvanceBookingDays, 1, 365)
        : DEFAULT_BUSINESS_RULES.maxAdvanceBookingDays,
    minAdvanceBookingHours:
      typeof br?.minAdvanceBookingHours === "number"
        ? clamp(br.minAdvanceBookingHours, 0, 168)
        : DEFAULT_BUSINESS_RULES.minAdvanceBookingHours,
    autoConfirm: typeof br?.autoConfirm === "boolean" ? br.autoConfirm : DEFAULT_BUSINESS_RULES.autoConfirm,
  };
}

export function getBufferMinutes(): number {
  return getEffectiveBusinessRules().bufferMinutes;
}

export function getSlotIntervalMinutes(): number {
  return SCHEDULING_CONFIG.SLOT_INTERVAL;
}

export function getDefaultMissionDuration(): number {
  return SCHEDULING_CONFIG.DEFAULT_MISSION_DURATION;
}

export function getMaxAdvanceBookingDays(): number {
  return getEffectiveBusinessRules().maxAdvanceBookingDays;
}

export function getMinAdvanceBookingHours(): number {
  return getEffectiveBusinessRules().minAdvanceBookingHours;
}

export function getAutoConfirmBookings(): boolean {
  return getEffectiveBusinessRules().autoConfirm;
}
