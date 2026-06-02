import type { PaymentProvider, SiteConfig } from "../../types";

type PaymentConfig = SiteConfig["payment"];

const ONLINE_PAYMENT_FALLBACK: PaymentProvider = "stripe";

export function resolveClientPaymentProvider(payment: PaymentConfig): PaymentProvider {
  if (payment.provider && payment.provider !== "none") {
    return payment.provider;
  }

  const hasPublicKey = Boolean(payment.providerPublicKey || payment.stripePublishableKey);
  if (payment.enabled && payment.mode !== "none" && payment.mode !== "cash-only" && hasPublicKey) {
    return ONLINE_PAYMENT_FALLBACK;
  }

  return "none";
}

export function requiresOnlinePayment(payment: PaymentConfig): boolean {
  return (
    payment.enabled &&
    payment.mode !== "none" &&
    payment.mode !== "cash-only" &&
    resolveClientPaymentProvider(payment) !== "none"
  );
}
