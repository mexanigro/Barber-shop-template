import { addMinutes, format, parse, startOfDay, isBefore, isAfter, setHours, setMinutes, getDay, isEqual } from "date-fns";
import { Appointment, Service, StaffMember, WorkDay, TimeRange } from "../types";
import { SCHEDULING_CONFIG } from "../constants";

const { BUFFER_TIME, SLOT_INTERVAL, DEFAULT_MISSION_DURATION } = SCHEDULING_CONFIG;

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
  // Two appointments overlap if one starts before the other ends 
  // AND the other starts before the first one ends.
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

  let currentTime = dayStart;

  while (isBefore(currentTime, dayEnd)) {
    const slotStart = currentTime;
    const slotEnd = addMinutes(slotStart, service.duration);
    
    // Total slot window including buffer for collision checking against FUTURE appointments
    const slotEndWithBuffer = addMinutes(slotEnd, BUFFER_TIME);

    // 1. Check if slot is in the past
    const isPast = isBefore(slotStart, now);
    
    // 2. Check if slot extends beyond working hours
    const exceedsWorkHours = isAfter(slotEnd, dayEnd);

    // 3. Check if slot overlaps with any breaks
    const overlapsBreak = workDay.breaks.some(brk => {
      const breakStart = parseTimeString(brk.start, date);
      const breakEnd = parseTimeString(brk.end, date);
      return isOverlapping(slotStart, slotEnd, breakStart, breakEnd);
    });

    // 4. Check if slot overlaps with existing appointments
    const dateStr = format(date, "yyyy-MM-dd");
    const hasOverlap = existingAppointments.some((app) => {
      if (app.date !== dateStr || app.staffId !== staffMember.id || app.status === 'cancelled') return false;
      
      const appStart = parse(app.time, "HH:mm", startOfDay(date));
      const appEnd = addMinutes(appStart, app.duration || DEFAULT_MISSION_DURATION);
      const appEndWithBuffer = addMinutes(appEnd, BUFFER_TIME);

      // Current slot cannot overlap with an existing app + its buffer
      return isOverlapping(slotStart, slotEndWithBuffer, appStart, appEndWithBuffer);
    });

    // 5. Check if slot overlaps with custom blocked slots
    const hasBlockedSlot = staffMember.blockedSlots?.some(block => {
      if (block.date !== dateStr) return false;
      const blockStart = parseTimeString(block.start, date);
      const blockEnd = parseTimeString(block.end, date);
      return isOverlapping(slotStart, slotEnd, blockStart, blockEnd);
    });

    // 6. Check if date is in blockedDates
    const isBlockedDate = staffMember.blockedDates?.includes(dateStr);

    if (!isPast && !exceedsWorkHours && !overlapsBreak && !hasOverlap && !hasBlockedSlot && !isBlockedDate) {
      slots.push(format(slotStart, "HH:mm"));
    }

    currentTime = addMinutes(currentTime, SLOT_INTERVAL);
  }

  return slots;
}

/**
 * Validates a specific appointment request against the current state of the board.
 */
export function checkAvailability(
  appointment: Omit<Appointment, 'id' | 'createdAt' | 'status'>,
  staffMember: StaffMember,
  existingAppointments: Appointment[]
): { available: boolean; reason?: string } {
  const date = parse(appointment.date, "yyyy-MM-dd", new Date());
  const workDay = getWorkDayForDate(date, staffMember.schedule);

  if (!workDay.isOpen) return { available: false, reason: "Personnel is off-duty for this sector." };
  
  const slotStart = parseTimeString(appointment.time, date);
  const slotEnd = addMinutes(slotStart, appointment.duration);
  const slotEndWithBuffer = addMinutes(slotEnd, BUFFER_TIME);
  const dayEnd = parseTimeString(workDay.hours.end, date);

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
    const appEnd = addMinutes(appStart, app.duration || DEFAULT_MISSION_DURATION);
    const appEndWithBuffer = addMinutes(appEnd, BUFFER_TIME);

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
