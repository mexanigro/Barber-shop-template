// ─── Server Payment Gateway Adapter (shared) ─────────────────────────────────
//
// Single source of truth for the payment gateway layer consumed by BOTH
// Express runtimes: server.ts (dev/self-host, firebase-admin) and api/index.ts
// (Vercel serverless, Firestore REST). The 2026-06-10 audit found security
// fixes landing in one runtime but not the other (e.g. Cardcom webhook
// verification) — keeping the verification logic here guarantees parity.
//
// Data access is injected: each runtime supplies its own credential loader
// (admin SDK vs REST) via `createCredentialCache`.

import Stripe from "stripe";

export type PaymentProvider =
  | "none"
  | "stripe"
  | "cardcom"
  | "paypal"
  | "meshulam"
  | "bit"
  | "yaadpay"
  | "authorize_net"
  | "square"
  | "other";

export const VALID_PROVIDERS: PaymentProvider[] = [
  "none",
  "stripe",
  "cardcom",
  "paypal",
  "meshulam",
  "bit",
  "yaadpay",
  "authorize_net",
  "square",
  "other",
];

export interface CheckoutParams {
  appointmentId: string;
  customerEmail: string;
  serviceName: string;
  amountCents: number;
  mode: "full" | "deposit";
  successUrl: string;
  cancelUrl: string;
  clientId: string;
}

export interface CheckoutResult {
  sessionId: string;
  redirectUrl: string;
}

export interface WebhookEvent {
  type: string;
  appointmentId?: string;
  amountTotalCents?: number;
  paymentMode?: string;
  /** Session id real del provider (Stripe session id / Cardcom LowProfileId). */
  sessionId?: string;
}

export interface ServerPaymentGateway {
  readonly provider: PaymentProvider;
  createCheckoutSession(params: CheckoutParams): Promise<CheckoutResult>;
  verifyWebhookEvent(rawBody: Buffer, headers: Record<string, string>): WebhookEvent | null;
}

export type PaymentCredentials = Record<string, string>;

export function buildStripeGateway(creds: PaymentCredentials): ServerPaymentGateway {
  const secretKey = creds.secretKey || process.env.STRIPE_SECRET_KEY || "";
  const webhookSecret = creds.webhookSecret || process.env.STRIPE_WEBHOOK_SECRET || "";
  if (!secretKey) throw new Error("Stripe secret key not configured");

  const stripe = new Stripe(secretKey, { apiVersion: "2026-03-25.dahlia" as any });

  return {
    provider: "stripe",
    async createCheckoutSession(p) {
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        customer_email: p.customerEmail,
        line_items: [{
          price_data: {
            currency: "usd",
            product_data: { name: p.mode === "deposit" ? `Deposit for ${p.serviceName}` : p.serviceName },
            unit_amount: p.amountCents,
          },
          quantity: 1,
        }],
        mode: "payment",
        success_url: p.successUrl,
        cancel_url: p.cancelUrl,
        metadata: {
          appointmentId: p.appointmentId,
          clientId: p.clientId,
          paymentProvider: "stripe",
          paymentMode: p.mode,
        },
      }, {
        idempotencyKey: `checkout_${p.clientId}_${p.appointmentId}`,
      });
      return { sessionId: session.id, redirectUrl: session.url! };
    },

    verifyWebhookEvent(rawBody, headers) {
      const sig = headers["stripe-signature"];
      if (!sig || !webhookSecret) return null;
      try {
        const event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
        if (event.type === "checkout.session.completed") {
          const s = event.data.object as Stripe.Checkout.Session;
          return {
            type: event.type,
            appointmentId: s.metadata?.appointmentId,
            amountTotalCents: s.amount_total ?? 0,
            paymentMode: s.metadata?.paymentMode,
            sessionId: s.id,
          };
        }
        return { type: event.type };
      } catch (err) {
        console.error("[Stripe] Webhook verification failed:", err instanceof Error ? err.message : err);
        return null;
      }
    },
  };
}

export function buildCardcomGateway(creds: PaymentCredentials, clientId: string): ServerPaymentGateway {
  return {
    provider: "cardcom",
    async createCheckoutSession(p) {
      const terminalNumber = creds.terminalNumber;
      const apiName = creds.apiName;
      if (!terminalNumber || !apiName) {
        throw new Error("Cardcom credentials not configured (terminalNumber, apiName).");
      }

      // Cardcom Low Profile API — creates a hosted payment page
      const response = await fetch("https://secure.cardcom.solutions/api/v11/LowProfile/Create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          TerminalNumber: Number(terminalNumber),
          ApiName: apiName,
          Amount: p.amountCents / 100,
          SuccessRedirectUrl: p.successUrl,
          FailedRedirectUrl: p.cancelUrl,
          WebhookUrl: `${p.successUrl.split("?")[0].replace(/\/$/, "")}/api/webhook`,
          Document: {
            To: p.customerEmail,
            CustomerName: p.serviceName,
          },
          CustomFields: {
            Field1: p.appointmentId,
            Field2: p.clientId,
            Field3: p.mode,
          },
        }),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Cardcom API error ${response.status}: ${text}`);
      }

      const data = await response.json() as { LowProfileId?: string; Url?: string; ResponseCode?: number; Description?: string };
      if (!data.Url || !data.LowProfileId) {
        throw new Error(`Cardcom returned no URL: ${data.Description || "unknown error"}`);
      }

      return { sessionId: data.LowProfileId, redirectUrl: data.Url };
    },

    verifyWebhookEvent(rawBody, headers) {
      try {
        // Verify Cardcom notification token — reject if not configured
        const notificationToken = creds.notificationToken || creds.webhookToken;
        if (!notificationToken) {
          console.error("[Cardcom] webhook rechazado: notificationToken no configurado");
          return null;
        }
        const receivedToken = headers["x-cardcom-notification-token"] ?? headers["notification-token"];
        if (receivedToken !== notificationToken) {
          console.error("[Cardcom] Webhook token mismatch — rejecting");
          return null;
        }

        // Verify the clientId field matches this tenant
        const body = JSON.parse(rawBody.toString("utf8"));
        if (body.CustomFields?.Field2 && body.CustomFields.Field2 !== clientId) {
          console.error("[Cardcom] Webhook clientId mismatch — rejecting");
          return null;
        }

        const appointmentId = body.CustomFields?.Field1 || body.ReturnValue;
        if (!appointmentId) return null;
        const isSuccess = body.ResponseCode === 0 || body.OperationResponse === 0;
        if (!isSuccess) return null;
        return {
          type: "checkout.session.completed",
          appointmentId,
          amountTotalCents: Math.round((body.Amount ?? 0) * 100),
          paymentMode: body.CustomFields?.Field3,
          sessionId: typeof body.LowProfileId === "string" ? body.LowProfileId
            : typeof body.LowProfileCode === "string" ? body.LowProfileCode : undefined,
        };
      } catch {
        console.error("[Cardcom] Webhook parse failed");
        return null;
      }
    },
  };
}

export function buildManualGateway(): ServerPaymentGateway {
  return {
    provider: "none",
    async createCheckoutSession() {
      throw new Error("Manual payment mode — no online checkout session.");
    },
    verifyWebhookEvent() {
      return null;
    },
  };
}

export function buildStubGateway(provider: PaymentProvider): ServerPaymentGateway {
  return {
    provider,
    async createCheckoutSession() {
      throw new Error(`Payment provider "${provider}" is not yet implemented. Contact support.`);
    },
    verifyWebhookEvent() {
      return null;
    },
  };
}

export type CredentialLoader = () => Promise<PaymentCredentials>;

/**
 * Wraps a runtime-specific credential fetch (admin SDK / Firestore REST) with
 * the short TTL cache both runtimes used. Short TTL for security.
 */
export function createCredentialCache(load: CredentialLoader, ttlMs = 60_000): CredentialLoader {
  let cache: { creds: PaymentCredentials; expiresAt: number } | null = null;
  return async () => {
    const now = Date.now();
    if (cache && cache.expiresAt > now) return cache.creds;
    const creds = await load();
    cache = { creds, expiresAt: now + ttlMs };
    return creds;
  };
}

export function buildPaymentGateway(
  provider: PaymentProvider,
  creds: PaymentCredentials,
  clientId: string,
): ServerPaymentGateway {
  switch (provider) {
    case "stripe":
      return buildStripeGateway(creds);
    case "cardcom":
      return buildCardcomGateway(creds, clientId);
    case "none":
      return buildManualGateway();
    case "paypal":
    case "meshulam":
    case "bit":
    case "yaadpay":
    case "authorize_net":
    case "square":
      return buildStubGateway(provider);
    default:
      return buildStubGateway(provider);
  }
}
