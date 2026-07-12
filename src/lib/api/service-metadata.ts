export type TrustedServiceMetadata = {
  serviceName?: string;
  duration?: number;
  price?: number;
  priceCents?: number;
  checkoutAmountCents?: number;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function finiteNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function positiveInteger(value: unknown): number | undefined {
  return typeof value === "number" && Number.isInteger(value) && value > 0
    ? value
    : undefined;
}

export function resolveServiceMetadata(
  tenantConfig: Record<string, unknown>,
  serviceId: string,
): TrustedServiceMetadata | null {
  const services = Array.isArray(tenantConfig.services)
    ? tenantConfig.services.filter((service): service is Record<string, unknown> => asRecord(service) !== null)
    : [];
  const baseService = services.find((service) => service.id === serviceId);

  const overrides = asRecord(tenantConfig.serviceOverrides);
  const serviceOverride = asRecord(overrides?.[serviceId]);

  if (!baseService && !serviceOverride) return null;

  const merged = {
    ...(baseService ?? {}),
    ...(serviceOverride ?? {}),
  };

  const price = finiteNumber(merged.price);
  const priceCents = price !== undefined ? Math.round(price * 100) : undefined;
  const duration = positiveInteger(merged.duration);
  const name = typeof merged.name === "string" ? merged.name.trim() : "";

  const payment = asRecord(tenantConfig.payment);
  const paymentMode = typeof payment?.mode === "string" ? payment.mode : undefined;
  const depositAmount = positiveInteger(payment?.depositAmount);
  const checkoutAmountCents =
    paymentMode === "deposit" && depositAmount !== undefined
      ? depositAmount
      : priceCents;

  return {
    ...(name ? { serviceName: name } : {}),
    ...(duration !== undefined ? { duration } : {}),
    ...(price !== undefined ? { price, priceCents } : {}),
    ...(checkoutAmountCents !== undefined ? { checkoutAmountCents } : {}),
  };
}
