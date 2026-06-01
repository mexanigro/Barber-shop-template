# Payment Provider Abstraction — Refactor Plan

## Current State (audit date: 2026-06-01)

### What's already done (client-side, this PR)

| File | Change |
|------|--------|
| `src/lib/payment/types.ts` | `PaymentGateway` interface + `CheckoutSessionParams/Result` |
| `src/types.ts` | `Appointment.providerSessionId` (generic); `stripeSessionId` deprecated |
| `src/types.ts` | `SiteConfig.payment.providerPublicKey` (generic); `stripePublishableKey` deprecated |
| `src/config/site.ts` | `providerPublicKey` reads `VITE_STRIPE_PUBLISHABLE_KEY` OR `VITE_PAYMENT_PUBLIC_KEY` |
| `BookingWizard.tsx` | `isOnlinePaymentProvider` — any `provider !== "none"` triggers the payment step |
| `PaymentsTab.tsx` | All `stripeSessionId` reads replaced by `providerSessionId ?? stripeSessionId` |
| Locales (4 languages) | `paymentSetupTitle/Body/EmailNote` — provider-agnostic; old `stripeTitle/Body/EmailNote` kept as fallbacks |

### Server-side (done 2026-06-01)

`server.ts` and `api/index.ts` now use the `ServerPaymentGateway` adapter pattern:
- `ServerPaymentGateway` interface: `createCheckoutSession()` + `verifyWebhookEvent()`
- `buildStripeGateway(creds)` — wraps existing Stripe SDK, reads secret from Firestore `payment_credentials/{clientId}` with env-var fallback
- `buildCardcomGateway(creds)` — Cardcom Low Profile API (create + webhook verify)
- `buildManualGateway()` — no-op for `provider: "none"`
- `buildStubGateway(provider)` — clear error for unimplemented providers (PayPal, Meshulam, Bit, etc.)
- `resolvePaymentGateway(provider)` — factory that reads credentials and returns the right adapter
- `reconcilePaidCheckout()` — provider-agnostic, writes `providerSessionId` (not `stripeSessionId`)
- `getClientRuntimeState()` — now reads provider from `config/{clientId}.payment.provider` (hub-managed) with fallback chain
- `/api/create-checkout-session` — uses gateway adapter, no longer hardcoded to Stripe
- `/api/webhook` — provider-agnostic, detects provider from cached state and delegates to gateway
- Credentials cached 60s via `payment_credentials/{clientId}` Firestore collection

---

## Architecture Target

```
Firestore config/{clientId}
  payment.provider = "cardcom" | "stripe" | "paypal" | ...
  payment.credentials = { publicKey, merchantId, ... }
              │
              ▼
server.ts / api/index.ts
  resolvePaymentGateway(provider) → PaymentGateway
              │
       ┌──────┴──────┐
  StripeGateway  CardcomGateway  PayPalGateway  ManualGateway
       │               │               │               │
  stripe SDK      Cardcom API     PayPal SDK     (no-op / manual log)
```

Each gateway implements:
```typescript
interface PaymentGateway {
  createCheckoutSession(params: CheckoutSessionParams): Promise<CheckoutSessionResult>;
  verifyWebhookSignature(rawBody: Buffer, headers: Record<string, string>): WebhookEvent;
}
```

---

## Step-by-Step Server Migration

### Step 1 — Extract gateway interface in server.ts (~30 min)

Create a local `PaymentGateway` interface in `server.ts` (not a separate file, since `api/index.ts` must be self-contained):

```typescript
interface ServerPaymentGateway {
  createCheckoutSession(params: {
    appointmentId: string;
    customerEmail: string;
    serviceName: string;
    amountCents: number;
    mode: 'full' | 'deposit';
    successUrl: string;
    cancelUrl: string;
  }): Promise<{ sessionId: string; redirectUrl: string }>;

  verifyWebhookEvent(rawBody: Buffer, sig: string): {
    type: string;
    appointmentId?: string;
    amountTotal?: number;
  } | null;
}
```

### Step 2 — Wrap Stripe in a gateway object (~20 min)

```typescript
function buildStripeGateway(): ServerPaymentGateway | null {
  const stripe = getStripe();
  if (!stripe) return null;

  return {
    async createCheckoutSession(p) {
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        customer_email: p.customerEmail,
        line_items: [{ price_data: { currency: "usd", product_data: { name: p.serviceName }, unit_amount: p.amountCents }, quantity: 1 }],
        mode: "payment",
        success_url: p.successUrl,
        cancel_url: p.cancelUrl,
        metadata: { appointmentId: p.appointmentId, paymentProvider: "stripe" },
      });
      return { sessionId: session.id, redirectUrl: session.url! };
    },

    verifyWebhookEvent(rawBody, sig) {
      const secret = process.env.STRIPE_WEBHOOK_SECRET;
      if (!secret) return null;
      try {
        const event = stripe.webhooks.constructEvent(rawBody, sig, secret);
        if (event.type === "checkout.session.completed") {
          const s = event.data.object as Stripe.Checkout.Session;
          return { type: event.type, appointmentId: s.metadata?.appointmentId, amountTotal: s.amount_total ?? 0 };
        }
        return { type: event.type };
      } catch { return null; }
    },
  };
}
```

### Step 3 — Add Cardcom gateway stub (~15 min)

```typescript
function buildCardcomGateway(): ServerPaymentGateway {
  return {
    async createCheckoutSession(p) {
      const merchantId = process.env.CARDCOM_MERCHANT_ID;
      const apiKey = process.env.CARDCOM_API_KEY;
      if (!merchantId || !apiKey) throw new Error("Cardcom credentials not configured (CARDCOM_MERCHANT_ID, CARDCOM_API_KEY).");

      // TODO: implement Cardcom Low Profile API
      // POST https://secure.cardcom.solutions/api/v11/LowProfile/Create
      // Docs: https://kb.cardcom.solutions/article/AA-02486/0
      throw new Error("Cardcom gateway not yet implemented. Contribute at: [repo URL]");
    },

    verifyWebhookEvent(_rawBody, _sig) {
      // TODO: Cardcom uses a different signature scheme
      return null;
    },
  };
}
```

### Step 4 — Factory function (~5 min)

```typescript
function resolvePaymentGateway(provider: PaymentProvider): ServerPaymentGateway | null {
  switch (provider) {
    case "stripe":      return buildStripeGateway();
    case "cardcom":     return buildCardcomGateway();
    case "paypal":      // TODO
    case "square":      // TODO
    case "meshulam":    // TODO
    case "yaadpay":     // TODO
    case "authorize_net": // TODO
    default:            return null; // manual / none
  }
}
```

### Step 5 — Update endpoints (~20 min)

Replace the body of `/api/create-checkout-session`:
```typescript
app.post("/api/create-checkout-session", async (req, res) => {
  const { provider } = await getClientRuntimeState();
  const gateway = resolvePaymentGateway(provider);
  if (!gateway) return res.status(503).json({ error: "No payment gateway configured for this client." });

  // ... validate params (unchanged) ...

  try {
    const result = await gateway.createCheckoutSession({ ... });
    // Store result.sessionId as providerSessionId (not stripeSessionId)
    res.json({ id: result.sessionId, url: result.redirectUrl });
  } catch (err) {
    res.status(500).json({ error: "Failed to create checkout session." });
  }
});
```

Replace the body of `/api/webhook`:
```typescript
app.post("/api/webhook", express.raw({ type: "application/json" }), async (req, res) => {
  const { provider } = await getClientRuntimeState();
  const gateway = resolvePaymentGateway(provider);
  if (!gateway) return res.status(503).json({ error: "No gateway." });

  const sig = req.headers["stripe-signature"] as string
    || req.headers["x-cardcom-signature"] as string   // provider-specific
    || "";

  const event = gateway.verifyWebhookEvent(req.body, sig);
  if (!event) return res.status(400).send("Webhook verification failed");

  if (event.type === "checkout.session.completed" && event.appointmentId) {
    await reconcilePayment(event.appointmentId, event.amountTotal ?? 0, provider);
  }

  res.json({ received: true });
});
```

### Step 6 — Store `providerSessionId` instead of `stripeSessionId`

When writing the appointment after checkout:
```typescript
// Before:
stripeSessionId: session.id

// After:
providerSessionId: result.sessionId,
paymentProvider: provider,
```

Keep backward-compat read: `(doc.providerSessionId || doc.stripeSessionId)` when reading old records.

---

## Environment Variable Strategy

| Provider | Current vars | Future vars |
|----------|-------------|-------------|
| Stripe | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `VITE_STRIPE_PUBLISHABLE_KEY` | Keep as-is |
| Cardcom | — | `CARDCOM_MERCHANT_ID`, `CARDCOM_API_KEY`, `CARDCOM_TERMINAL_NUMBER` |
| PayPal | — | `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `VITE_PAYPAL_CLIENT_ID` |
| Square | — | `SQUARE_ACCESS_TOKEN`, `SQUARE_LOCATION_ID`, `VITE_SQUARE_APP_ID` |
| Generic | `PAYMENT_PROVIDER` (existing) | `VITE_PAYMENT_PUBLIC_KEY` (new, maps to publishable key of active provider) |

The `provider` field in Firestore `config/{clientId}` always takes precedence over env vars.

---

## Data Migration (existing Stripe clients)

No breaking migration needed:
- `stripeSessionId` stays on old records (reads will use `providerSessionId ?? stripeSessionId`)
- New records from any provider write `providerSessionId`
- `PaymentsTab` already reads `providerSessionId ?? stripeSessionId` after this PR

---

## Providers — Implementation Priority

| Provider | Market | Complexity | Priority |
|----------|--------|-----------|----------|
| Stripe | Global | Already done | ✅ Done |
| Cardcom | Israel | Low Profile redirect API, webhook via `x-cardcom-signature` | 🔜 Next |
| PayPal | Global | Orders API v2 + IPN/webhooks | Medium |
| Meshulam | Israel | Similar to Cardcom | Medium |
| Square | US/CA/AU/UK | Square Web Payments SDK | Low |
| PayPal | LatAm | Pending approval via MercadoPago | Future |

---

## api/index.ts Note

`api/index.ts` is deliberately self-contained (no cross-file imports) due to Vercel's single-file compilation requirement. The same gateway changes must be duplicated there. One strategy to avoid drift:

1. Keep all gateway logic in `server.ts`
2. Run a build step that inlines `server.ts` into `api/index.ts` (e.g. using `esbuild --bundle`)
3. OR: accept duplication and keep a `# AUTO-GENERATED — do not edit` comment at the top of `api/index.ts`

The cleaner long-term solution is option 2 (bundle with esbuild).
