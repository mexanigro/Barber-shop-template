export type ResolvedServiceMetadata = {
  id: string;
  name: string;
  duration: number;
  price: number;
  priceCents: number;
  checkoutAmountCents?: number;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export function resolveServiceMetadata(
  tenantConfig: Record<string, unknown>,
  serviceId: string,
): ResolvedServiceMetadata | null {
  const visibleServices = Array.isArray(tenantConfig.visibleServices)
    ? tenantConfig.visibleServices.filter((id): id is string => typeof id === "string")
    : [];
  if (visibleServices.length > 0 && !visibleServices.includes(serviceId)) {
    return null;
  }

  const services = Array.isArray(tenantConfig.services) ? tenantConfig.services : [];
  const base = services
    .map(asRecord)
    .find((svc): svc is Record<string, unknown> => svc?.id === serviceId);
  if (!base) return null;

  const overridesRoot = asRecord(tenantConfig.serviceOverrides);
  const override = overridesRoot ? asRecord(overridesRoot[serviceId]) : null;
  const merged = { ...base, ...(override ?? {}) };

  const name = typeof merged.name === "string" ? merged.name.trim() : "";
  const duration = asNumber(merged.duration);
  const price = asNumber(merged.price);
  if (!name || !Number.isInteger(duration) || !duration || price === null || price <= 0) {
    return null;
  }

  const priceCents = Math.round(price * 100);
  if (!Number.isInteger(priceCents) || priceCents < 50 || priceCents > 2_000_000) {
    return null;
  }

  const payment = asRecord(tenantConfig.payment);
  const mode = typeof payment?.mode === "string" ? payment.mode : "";
  const depositAmount = asNumber(payment?.depositAmount);
  const checkoutAmountCents =
    mode === "deposit" && depositAmount && depositAmount > 0
      ? Math.round(depositAmount)
      : mode === "full"
        ? priceCents
        : undefined;

  return {
    id: serviceId,
    name,
    duration,
    price,
    priceCents,
    ...(checkoutAmountCents ? { checkoutAmountCents } : {}),
  };
}
