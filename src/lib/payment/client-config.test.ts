import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { requiresOnlinePayment, resolveClientPaymentProvider } from "./client-config.ts";
import type { SiteConfig } from "../../types.ts";

type PaymentConfig = SiteConfig["payment"];

const basePayment: PaymentConfig = {
  enabled: false,
  mode: "none",
  currency: "ils",
  provider: "none",
  providerPublicKey: "",
  stripePublishableKey: "",
};

function payment(overrides: Partial<PaymentConfig>): PaymentConfig {
  return { ...basePayment, ...overrides };
}

describe("client payment provider resolution", () => {
  test("falls back to Stripe for legacy online-payment configs with only a publishable key", () => {
    const config = payment({
      enabled: true,
      mode: "deposit",
      stripePublishableKey: "pk_test_legacy",
    });

    assert.equal(resolveClientPaymentProvider(config), "stripe");
    assert.equal(requiresOnlinePayment(config), true);
  });

  test("keeps cash-only and disabled payment configs out of checkout", () => {
    assert.equal(
      requiresOnlinePayment(payment({ enabled: true, mode: "cash-only", stripePublishableKey: "pk_test" })),
      false,
    );
    assert.equal(
      requiresOnlinePayment(payment({ enabled: false, mode: "deposit", stripePublishableKey: "pk_test" })),
      false,
    );
  });

  test("honors an explicitly configured provider", () => {
    const config = payment({
      enabled: true,
      mode: "full",
      provider: "cardcom",
    });

    assert.equal(resolveClientPaymentProvider(config), "cardcom");
    assert.equal(requiresOnlinePayment(config), true);
  });
});
