import { test } from "node:test";
import assert from "node:assert/strict";

import { resolveServiceMetadata } from "../src/lib/api/service-metadata";

test("service metadata applies overrides and computes deposit checkout amount", () => {
  const resolved = resolveServiceMetadata({
    visibleServices: ["cut"],
    services: [
      { id: "cut", name: "Haircut", duration: 45, price: 120 },
    ],
    serviceOverrides: {
      cut: { name: "Premium Cut", price: 150 },
    },
    payment: { mode: "deposit", depositAmount: 2500 },
  }, "cut");

  assert.deepEqual(resolved, {
    id: "cut",
    name: "Premium Cut",
    duration: 45,
    price: 150,
    priceCents: 15000,
    checkoutAmountCents: 2500,
  });
});

test("service metadata rejects hidden or incomplete services", () => {
  assert.equal(resolveServiceMetadata({
    visibleServices: ["cut"],
    services: [{ id: "color", name: "Color", duration: 60, price: 200 }],
  }, "color"), null);

  assert.equal(resolveServiceMetadata({
    services: [{ id: "cut", name: "Cut", duration: 0, price: 100 }],
  }, "cut"), null);
});
