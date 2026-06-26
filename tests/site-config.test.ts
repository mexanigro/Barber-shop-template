import { test } from "node:test";
import assert from "node:assert/strict";

import { applyTenantConfigOverride, siteConfig, switchSiteToNiche } from "../src/config/site";

test("sparse tenant hours overlay preserves preset days not present in Firestore", () => {
  switchSiteToNiche("cafeteria", "en");
  const presetMonday = siteConfig.hours.monday;
  assert.ok(presetMonday, "cafeteria preset should have monday hours for this regression");

  applyTenantConfigOverride({
    hours: {
      sunday: { start: "11:00", end: "15:00" },
    },
  } as never);

  assert.deepEqual(siteConfig.hours.sunday, { start: "11:00", end: "15:00" });
  assert.deepEqual(siteConfig.hours.monday, presetMonday);
});

test("sparse tenant hours overlay can explicitly close one provided day", () => {
  switchSiteToNiche("cafeteria", "en");
  const presetTuesday = siteConfig.hours.tuesday;
  assert.ok(presetTuesday, "cafeteria preset should have tuesday hours for this regression");

  applyTenantConfigOverride({
    hours: {
      monday: null,
    },
  } as never);

  assert.equal(siteConfig.hours.monday, null);
  assert.deepEqual(siteConfig.hours.tuesday, presetTuesday);
});
