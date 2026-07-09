import { test } from "node:test";
import assert from "node:assert/strict";

import { mergeTenantWeeklyHours, type WeeklyHours } from "../src/lib/hours-merge";

const presetHours: WeeklyHours = {
  sunday: { start: "09:00", end: "17:00" },
  monday: { start: "09:00", end: "17:00" },
  tuesday: { start: "09:00", end: "17:00" },
  wednesday: { start: "09:00", end: "17:00" },
  thursday: { start: "09:00", end: "17:00" },
  friday: { start: "09:00", end: "14:00" },
  saturday: null,
};

test("tenant weekly hours preserve omitted preset days", () => {
  const merged = mergeTenantWeeklyHours(presetHours, {
    sunday: { start: "10:00", end: "18:00" },
  });

  assert.deepEqual(merged.sunday, { start: "10:00", end: "18:00" });
  assert.deepEqual(merged.monday, { start: "09:00", end: "17:00" });
  assert.deepEqual(merged.friday, { start: "09:00", end: "14:00" });
  assert.equal(merged.saturday, null);
});

test("tenant weekly hours treat explicit null as closed", () => {
  const merged = mergeTenantWeeklyHours(presetHours, {
    monday: null,
  });

  assert.equal(merged.monday, null);
  assert.deepEqual(merged.tuesday, { start: "09:00", end: "17:00" });
});
