import {
  addMinutes,
  addHours,
  format,
  parse,
  startOfDay,
  isBefore,
  isAfter,
  setHours,
  setMinutes,
  getDay,
  isSameDay,
} from "date-fns";
import { Appointment, Service, StaffMember, WorkDay } from "../types";
import { SCHEDULING_CONFIG } from "../constants";
import {
  getBufferMinutes,
  getDefaultMissionDuration,
  getMinAdvanceBookingHours,
  getSlotIntervalMinutes,
} from "./schedulingRules";

function parseTimeString(time: string, date: Date) {
  const [hours, minutes] = time.split(":").map(Number);
  return setMinutes(setHours(startOfDay(date), hours), minutes);
}

function getWorkDayForDate(date: Date, schedule: StaffMember["schedule"]): WorkDay {
  const dayIndex = getDay(date);
  const days: (keyof StaffMember["schedule"])[] = [
    "sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"
  ];
  return schedule[days[dayIndex]];
}

export function isOverlapping(
  start1: Date, end1: Date,
  start2: Date, end2: Date
) {
  return isBefore(start1, end2) && isAfter(end1, start2);
}

export function generateSlots(
  date: Date,
  staffMember: StaffMember,
  service: Service,
  existingAppointments: Appointment[]
) {
  const slots: string[] = [];
  const workDay = getWorkDayForDate(date, staffMember.schedule);

  if (!workDay.isOpen) return [];

  const dayStart = parseTimeString(workDay.hours.start, date);
  const dayEnd = parseTimeString(workDay.hours.end, date);
  const now = new Date();
  const buf = getBufferMinutes();
  const slotStep = getSlotIntervalMinutes();
  const defaultDur = getDefaultMissionDuration();
  const minBookable = addHours(now, getMinAdvanceBookingHours());

  let currentTime = dayStart;

  while (isBefore(currentTime, dayEnd)) {
    const slotStart = currentTime;
    const slotEnd = addMinutes(slotStart, service.duration);

    const slotEndWithBuffer = addMinutes(slotEnd, buf);

    const isPast = isBefore(slotStart, now);

    const violatesMinAdvance =
      isSameDay(date, now) && isBefore(slotStart, minBookable);

    const exceedsWorkHours = isAfter(slotEnd, dayEnd);

    const overlapsBreak = workDay.breaks.some(brk => {
      const breakStart = parseTimeString(brk.start, date);
      const breakEnd = parseTimeString(brk.end, date);
      return isOverlapping(slotStart, slotEnd, breakStart, breakEnd);
    });

    const dateStr = format(date, "yyyy-MM-dd");
    const hasOverlap = existingAppointments.some((app) => {
      if (app.date !== dateStr || app.staffId !== staffMember.id || app.status === 'cancelled') return false;

      const appStart = parse(app.time, "HH:mm", startOfDay(date));
      const appEnd = addMinutes(appStart, app.duration || defaultDur);
      const appEndWithBuffer = addMinutes(appEnd, buf);

      return isOverlapping(slotStart, slotEndWithBuffer, appStart, appEndWithBuffer);
    });

    const hasBlockedSlot = staffMember.blockedSlots?.some(block => {
      if (block.date !== dateStr) return false;
      const blockStart = parseTimeString(block.start, date);
      const blockEnd = parseTimeString(block.end, date);
      return isOverlapping(slotStart, slotEnd, blockStart, blockEnd);
    });

    const isBlockedDate = staffMember.blockedDates?.includes(dateStr);

    if (
      !violatesMinAdvance &&
      !isPast &&
      !exceedsWorkHours &&
      !overlapsBreak &&
      !hasOverlap &&
      !hasBlockedSlot &&
      !isBlockedDate
    ) {
      slots.push(format(slotStart, "HH:mm"));
    }

    currentTime = addMinutes(currentTime, slotStep);
  }

  return slots;
}

/**
 * Validates a specific appointment request against the current state of the board.
 */
export function checkAvailability(
  appointment: Omit<Appointment, 'id' | 'createdAt' | 'status' | 'clientId'>,
  staffMember: StaffMember,
  existingAppointments: Appointment[]
): { available: boolean; reason?: string } {
  const date = parse(appointment.date, "yyyy-MM-dd", new Date());
  const workDay = getWorkDayForDate(date, staffMember.schedule);
  const buf = getBufferMinutes();
  const defaultDur = getDefaultMissionDuration();
  const now = new Date();

  if (!workDay.isOpen) return { available: false, reason: "Personnel is off-duty for this sector." };

  const slotStart = parseTimeString(appointment.time, date);
  const slotEnd = addMinutes(slotStart, appointment.duration);
  const slotEndWithBuffer = addMinutes(slotEnd, buf);
  const dayEnd = parseTimeString(workDay.hours.end, date);

  if (isSameDay(date, now) && isBefore(slotStart, addHours(now, getMinAdvanceBookingHours()))) {
    return { available: false, reason: "This slot is inside the minimum advance booking window." };
  }

  if (isAfter(slotEnd, dayEnd)) return { available: false, reason: "Operation exceeds operational window." };

  const overlapsBreak = workDay.breaks.some(brk => {
    const breakStart = parseTimeString(brk.start, date);
    const breakEnd = parseTimeString(brk.end, date);
    return isOverlapping(slotStart, slotEnd, breakStart, breakEnd);
  });
  if (overlapsBreak) return { available: false, reason: "Slot intersects with mandatory personnel break." };

  const isBlockedDate = staffMember.blockedDates?.includes(appointment.date);
  if (isBlockedDate) return { available: false, reason: "Operational sector is locked for this date." };

  const carriesConflict = existingAppointments.some((app) => {
    if (app.date !== appointment.date || app.staffId !== staffMember.id || app.status === 'cancelled') return false;

    const appStart = parse(app.time, "HH:mm", startOfDay(date));
    const appEnd = addMinutes(appStart, app.duration || defaultDur);
    const appEndWithBuffer = addMinutes(appEnd, buf);

    return isOverlapping(slotStart, slotEndWithBuffer, appStart, appEndWithBuffer);
  });
  if (carriesConflict) return { available: false, reason: "Temporal conflict detected. Slot is already allocated within mission bounds." };

  const hasBlockedSlot = staffMember.blockedSlots?.some(block => {
    if (block.date !== appointment.date) return false;
    const blockStart = parseTimeString(block.start, date);
    const blockEnd = parseTimeString(block.end, date);
    return isOverlapping(slotStart, slotEnd, blockStart, blockEnd);
  });
  if (hasBlockedSlot) return { available: false, reason: "Target slot is within a restricted tactical block." };

  return { available: true };
}
