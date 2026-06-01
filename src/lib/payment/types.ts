import type { PaymentMode, PaymentProvider } from "../../types";

/**
 * Params passed to every gateway's createCheckoutSession.
 * Provider-specific details (API keys, merchant IDs) are resolved
 * server-side from environment variables — never passed from the client.
 */
export interface CheckoutSessionParams {
  appointmentId: string;
  customerEmail: string;
  serviceName: string;
  /** Amount in the smallest currency unit (cents, agorot, etc.). */
  amountSmallestUnit: number;
  mode: PaymentMode;
}

export interface CheckoutSessionResult {
  /** Provider-assigned session / transaction ID stored on the appointment. */
  sessionId: string;
  /** URL to redirect the customer to for payment completion. */
  redirectUrl: string;
}

/**
 * Generic payment gateway interface.
 * Every provider plugin must implement this contract.
 *
 * Server factory (`resolvePaymentGateway`) picks the right implementation
 * based on `config/{clientId}.payment.provider` from Firestore.
 *
 * @example
 *   // server.ts / api/index.ts
 *   const gateway = resolvePaymentGateway(provider);
 *   const result = await gateway.createCheckoutSession(params);
 *   res.json({ url: result.redirectUrl });
 */
export interface PaymentGateway {
  readonly provider: PaymentProvider;
  createCheckoutSession(params: CheckoutSessionParams): Promise<CheckoutSessionResult>;
}

/** Client-facing config subset — safe to expose to the frontend. */
export interface PaymentGatewayConfig {
  provider: PaymentProvider;
  /**
   * Public/publishable key for client-side SDK initialisation.
   * Maps to VITE_STRIPE_PUBLISHABLE_KEY for Stripe, or the equivalent
   * for other providers. Never contains secret keys.
   */
  providerPublicKey?: string;
  currency: string;
  mode: PaymentMode;
  depositAmount?: number;
}
