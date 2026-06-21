import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";

import {
  applyTenantConfigOverride,
  siteConfig,
  switchSiteLanguage,
  switchSiteToNiche,
} from "./site.ts";

beforeEach(() => {
  switchSiteToNiche("cafeteria", "he");
});

test("partial hours overrides preserve inherited weekdays", () => {
  const monday = siteConfig.hours.monday;
  const friday = siteConfig.hours.friday;

  applyTenantConfigOverride({
    hours: {
      sunday: { start: "07:00", end: "22:00" },
    },
  });

  assert.deepEqual(siteConfig.hours.sunday, { start: "07:00", end: "22:00" });
  assert.deepEqual(siteConfig.hours.monday, monday);
  assert.deepEqual(siteConfig.hours.friday, friday);
});

test("explicit null hours close a day that the preset opens", () => {
  assert.notEqual(siteConfig.hours.monday, null);

  applyTenantConfigOverride({
    hours: {
      monday: null,
    },
  });

  assert.equal(siteConfig.hours.monday, null);
});

test("partial hours overrides survive runtime language switches", () => {
  switchSiteToNiche("barberia", "he");

  applyTenantConfigOverride({
    hours: {
      sunday: { start: "07:00", end: "22:00" },
    },
  });

  switchSiteLanguage("en");

  assert.deepEqual(siteConfig.hours.sunday, { start: "07:00", end: "22:00" });
  assert.deepEqual(siteConfig.hours.monday, { start: "09:00", end: "20:00" });
  assert.deepEqual(siteConfig.hours.friday, { start: "09:00", end: "21:00" });
});
