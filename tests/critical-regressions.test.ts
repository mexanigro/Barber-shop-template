import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

import { mergeWeeklyHours, type WeeklyHours } from "../src/lib/hours-merge";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const baseHours: WeeklyHours = {
  sunday: { start: "09:00", end: "17:00" },
  monday: { start: "09:00", end: "17:00" },
  tuesday: { start: "09:00", end: "17:00" },
  wednesday: { start: "09:00", end: "17:00" },
  thursday: { start: "09:00", end: "17:00" },
  friday: { start: "09:00", end: "13:00" },
  saturday: { start: "10:00", end: "14:00" },
};

test("sparse hours overrides preserve omitted days and close explicit null days", () => {
  const merged = mergeWeeklyHours(baseHours, {
    saturday: null,
  });

  assert.deepEqual(merged.sunday, baseHours.sunday);
  assert.deepEqual(merged.friday, baseHours.friday);
  assert.equal(merged.saturday, null);
});

test("complete hours overrides still replace every provided day", () => {
  const merged = mergeWeeklyHours(baseHours, {
    sunday: null,
    monday: { start: "08:00", end: "16:00" },
    tuesday: null,
    wednesday: { start: "08:00", end: "16:00" },
    thursday: null,
    friday: { start: "08:00", end: "12:00" },
    saturday: null,
  });

  assert.equal(merged.sunday, null);
  assert.deepEqual(merged.monday, { start: "08:00", end: "16:00" });
  assert.equal(merged.tuesday, null);
  assert.deepEqual(merged.friday, { start: "08:00", end: "12:00" });
  assert.equal(merged.saturday, null);
});

test("Vercel API bootstrap accepts deployed Firebase project-id fallbacks and keeps Gemini optional", () => {
  const apiSrc = readFileSync(path.join(ROOT, "api", "index.ts"), "utf8");
  const requiredBlock = apiSrc.match(/const required = \[(?<body>[\s\S]*?)\];/)?.groups?.body ?? "";
  const optionalBlock = apiSrc.match(/const optional = \[(?<body>[\s\S]*?)\];/)?.groups?.body ?? "";

  assert.match(requiredBlock, /resolveFirebaseProjectId\(\)/);
  assert.doesNotMatch(requiredBlock, /GEMINI_API_KEY/);
  assert.match(optionalBlock, /GEMINI_API_KEY/);
  assert.match(apiSrc, /FIREBASE_ADMIN_PROJECT_ID\?\.trim\(\)/);
  assert.match(apiSrc, /VITE_FIREBASE_PROJECT_ID\?\.trim\(\)/);
});

test("Storage rules use the custom claim shape set by tenant provisioning", () => {
  const storageRules = readFileSync(path.join(ROOT, "storage.rules"), "utf8");

  assert.match(storageRules, /request\.auth\.token\.clientId == clientId/);
  assert.doesNotMatch(storageRules, /client_id/);
});
