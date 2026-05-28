/**
 * Intent router — algorithmic dispatcher for AI chat queries.
 *
 * Goal: cut Gemini token spend by recognising common queries via regex/keyword
 * matching and either answering them directly (deterministic) or calling the
 * model with a reduced tool set and a shorter system prompt (model_with_scope).
 *
 * Two flavours:
 *   - routeAdminIntent: CRM Assistant (admin chat) with tool-calling.
 *   - routePublicIntent: landing-page chatbot, simple Q&A from config.
 *
 * Keeps zero runtime dependencies — both server.ts (via import) and the
 * inline copy in api/index.ts share the same patterns. Tests in
 * src/lib/intent-router.test.ts.
 *
 * Note: many actions emitted by the admin router refer to tools that have
 * NOT been built yet (query_stock, list_tasks, etc — Bloques I + J). The
 * router still recognises them so the integration layer can return a
 * "feature not built yet" placeholder OR a real executor once it lands.
 */

// ───── Types ─────────────────────────────────────────────────────────────────

export type AdminIntentScope = "stock" | "tasks" | "customers" | "general";

export type AdminDeterministicAction =
  | { action: "query_stock"; args: { itemName: string } }
  | { action: "set_stock"; args: { itemName: string; count: number } }
  | { action: "consume_stock"; args: { itemName: string; count: number } }
  | { action: "add_stock"; args: { itemName: string; count: number } }
  | { action: "list_tasks"; args: { filter: "pending" | "all" } }
  | { action: "create_task"; args: { title: string } }
  | { action: "complete_task"; args: { titleOrId: string } }
  | { action: "query_customer"; args: { name: string } }
  | {
      action: "query_count";
      args: { type: "customers" | "appointments"; period: "today" | "week" };
    }
  | { action: "confirm_appointment"; args: { customerName: string } };

export type AdminRouteResult =
  | ({
      kind: "deterministic";
      scope: AdminIntentScope;
    } & AdminDeterministicAction)
  | {
      kind: "model_with_scope";
      scope: AdminIntentScope;
      tools: AdminToolName[];
      includeSnapshot: boolean;
    }
  | {
      kind: "model_full";
      tools: AdminToolName[];
      includeSnapshot: boolean;
    };

/**
 * The 8 tools that exist today + the new lazy snapshot tool. Order is
 * preserved when emitted to Gemini.
 */
export type AdminToolName =
  | "walk_in"
  | "support_request"
  | "book_appointment"
  | "update_appointment"
  | "mark_paid"
  | "update_customer"
  | "add_walkin_count"
  | "bulk_update_status"
  | "get_crm_snapshot"
  | "query_stock"
  | "consume_stock"
  | "add_stock"
  | "create_task"
  | "list_tasks"
  | "complete_task";

export const ALL_ADMIN_TOOLS: readonly AdminToolName[] = [
  "walk_in",
  "support_request",
  "book_appointment",
  "update_appointment",
  "mark_paid",
  "update_customer",
  "add_walkin_count",
  "bulk_update_status",
  "get_crm_snapshot",
  "query_stock",
  "consume_stock",
  "add_stock",
  "create_task",
  "list_tasks",
  "complete_task",
] as const;

/**
 * Whitelist per scope. Stock + tasks are intentionally minimal — the future
 * Bloque I (stock) and Bloque J (tasks) tools will be appended here when
 * they exist. update_customer is kept in "stock" because a stock query may
 * incidentally reference a customer ("la cera me la pidió Juana, sumale tag
 * vip"); leaving it lets the model still tag the customer.
 */
export const SCOPE_TOOLS: Record<AdminIntentScope, AdminToolName[]> = {
  stock: ["query_stock", "consume_stock", "add_stock", "update_customer", "get_crm_snapshot"],
  tasks: ["create_task", "list_tasks", "complete_task", "update_customer", "get_crm_snapshot"],
  customers: [
    "walk_in",
    "book_appointment",
    "update_appointment",
    "mark_paid",
    "update_customer",
    "add_walkin_count",
    "bulk_update_status",
    "get_crm_snapshot",
  ],
  general: [...ALL_ADMIN_TOOLS],
};

// ───── Public router ─────────────────────────────────────────────────────────

export type PublicIntentScope =
  | "hours"
  | "location"
  | "service_price"
  | "booking"
  | "general";

export type PublicRouteResult =
  | {
      kind: "deterministic";
      scope: PublicIntentScope;
      response: string;
    }
  | {
      kind: "model_full";
      // The public path has no tools — model_with_scope is unused for now.
    };

export type PublicChatContext = {
  hours?: Record<string, { open?: string; close?: string; closed?: boolean } | unknown>;
  contact?: { phone?: string; email?: string; address?: string };
  services?: Array<{ name?: string; price?: string; duration?: string }>;
  /**
   * Locale to pick the canned strings. Falls back to "en".
   */
  uiLanguage?: "en" | "he" | "ru" | string;
  /**
   * Optional copy override for the booking redirect line. The default text is
   * generic enough but a tenant may prefer their own phrasing.
   */
  bookingRedirectMessage?: string;
};

// ───── Normalisation helpers ─────────────────────────────────────────────────

/**
 * Lowercase, strip combining accents, collapse whitespace. So that "agregá",
 * "agrega" and "AGREGÁ" all hit the same path.
 */
export function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[¿¡]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[?!.,;:]+$/g, "")
    .trim();
}

function wordCount(s: string): number {
  if (!s.trim()) return 0;
  return s.trim().split(/\s+/).length;
}

function containsAny(haystack: string, needles: readonly string[]): boolean {
  return needles.some((n) => haystack.includes(n));
}

// ───── Ambiguity / multi-action detectors ───────────────────────────────────

const AMBIGUOUS_KEYWORDS = [
  "por que",
  "porque",
  "explicame",
  "explica me",
  "explain",
  "explique",
  "que opinas",
  "que pensas",
  "que piensas",
  "que te parece",
  "what do you think",
  "como funciona",
  "how does",
  "why ",
] as const;

function isAmbiguous(normalized: string): boolean {
  return containsAny(normalized, AMBIGUOUS_KEYWORDS);
}

// ───── Scope keywords ────────────────────────────────────────────────────────

const STOCK_KEYWORDS = [
  "stock",
  "inventario",
  "queda",
  "quedan",
  "desinfectante",
  "shampoo",
  "tinta",
  "cera",
  "alcohol",
  "producto",
  "productos",
] as const;

const TASK_KEYWORDS = [
  "tarea",
  "tareas",
  "todo",
  "todos los pendiente",
  "pendiente",
  "pendientes",
  "checklist",
] as const;

const CUSTOMER_KEYWORDS = [
  "cliente",
  "clientes",
  "customer",
  "customers",
  "cita",
  "citas",
  "turno",
  "turnos",
  "appointment",
  "appointments",
  "agenda",
  "agendar",
  "reserva",
  "reservas",
] as const;

const SNAPSHOT_KEYWORDS = [
  "resumen",
  "panorama",
  "como va",
  "como vamos",
  "como va el dia",
  "como va la semana",
  "summary",
  "overview",
  "dame un resumen",
  "agenda de hoy",
  "que tengo hoy",
  "que hay hoy",
  "el dia de hoy",
] as const;

function detectAdminScope(normalized: string): AdminIntentScope {
  // Order matters slightly — tasks before customers because "tareas pendientes"
  // shouldn't be mistaken for a customer query.
  if (containsAny(normalized, STOCK_KEYWORDS)) return "stock";
  if (containsAny(normalized, TASK_KEYWORDS)) return "tasks";
  if (containsAny(normalized, CUSTOMER_KEYWORDS)) return "customers";
  return "general";
}

function wantsSnapshot(normalized: string): boolean {
  return containsAny(normalized, SNAPSHOT_KEYWORDS);
}

// ───── Deterministic admin patterns ──────────────────────────────────────────

type AdminMatcher = {
  scope: AdminIntentScope;
  test(n: string): AdminDeterministicAction | null;
};

const stripPunctuation = (s: string) =>
  s.replace(/[.?!,;:¡¿"']+/g, " ").replace(/\s+/g, " ").trim();

const cleanItem = (raw: string): string => {
  // Drop leading "de " / "del " / "la " / "el " / "los " / "las " articles.
  let s = stripPunctuation(raw);
  s = s.replace(/^(?:de|del|la|el|los|las)\s+/, "");
  return s.trim();
};

const ADMIN_MATCHERS: AdminMatcher[] = [
  // ── STOCK ──────────────────────────────────────────────────────────────────
  {
    // "cuánto desinfectante me queda" / "cuanta cera tengo"
    scope: "stock",
    test(n) {
      const m = n.match(
        /^(?:cuanto|cuanta)s?\s+(.+?)\s+(?:me\s+)?(?:queda|quedan|tengo|hay)\b\??$/,
      );
      if (!m) return null;
      const itemName = cleanItem(m[1]);
      if (itemName.length < 2) return null;
      return { action: "query_stock", args: { itemName } };
    },
  },
  {
    // "me quedan 5 cervezas" / "me queda 1 botella"
    scope: "stock",
    test(n) {
      const m = n.match(/^me\s+quedan?\s+(\d+)\s+(.+?)\.?$/);
      if (!m) return null;
      const count = Number(m[1]);
      const itemName = cleanItem(m[2]);
      if (!Number.isFinite(count) || itemName.length < 2) return null;
      return { action: "set_stock", args: { itemName, count } };
    },
  },
  {
    // "usé 3 cintas" / "consumi 5 de cera" / "gaste 2 botellas"
    scope: "stock",
    test(n) {
      const m = n.match(
        /^(?:use|usamos|usaste|consumi|consumimos|consumiste|gaste|gastamos|gastaste|usar)\s+(\d+)\s+(.+?)\.?$/,
      );
      if (!m) return null;
      const count = Number(m[1]);
      const itemName = cleanItem(m[2]);
      if (!Number.isFinite(count) || itemName.length < 2) return null;
      return { action: "consume_stock", args: { itemName, count } };
    },
  },
  {
    // "recibí 3 botellas" / "compre 5 de cera" / "llegaron 10 cintas"
    scope: "stock",
    test(n) {
      const m = n.match(
        /^(?:recibi|recibimos|compre|compramos|llegaron|llego|sumar|sumamos|sume|agregue|agregar|agrega)\s+(\d+)\s+(.+?)\.?$/,
      );
      if (!m) return null;
      const count = Number(m[1]);
      const itemName = cleanItem(m[2]);
      if (!Number.isFinite(count) || itemName.length < 2) return null;
      // Avoid colliding with create_task — "agregar tarea ..." was matched by
      // the earlier 'agrega(?:r)? (?:una?\s+)?(?:tarea|todo)' regex, which
      // only fires when the noun is "tarea" or "todo". Anything else here
      // (e.g. "agregar 5 botellas") is a stock add.
      return { action: "add_stock", args: { itemName, count } };
    },
  },
  {
    // "agrega 3 botellas al stock" / "sumá 2 al inventario"
    scope: "stock",
    test(n) {
      const m = n.match(
        /^(?:agrega(?:r)?|suma(?:r)?)\s+(\d+)\s+(.+?)\s+al\s+(?:stock|inventario)\.?$/,
      );
      if (!m) return null;
      const count = Number(m[1]);
      const itemName = cleanItem(m[2]);
      if (!Number.isFinite(count) || itemName.length < 2) return null;
      return { action: "add_stock", args: { itemName, count } };
    },
  },
  // ── TASKS ─────────────────────────────────────────────────────────────────
  {
    // "pendientes" / "tareas pendientes" / "que tengo pendiente" / "que tengo que hacer"
    scope: "tasks",
    test(n) {
      if (
        /^(?:pendientes|tareas\s+pendientes|que\s+tengo\s+pendiente|que\s+tengo\s+que\s+hacer|que\s+hay\s+pendiente|pendings?)\??$/.test(
          n,
        )
      ) {
        return { action: "list_tasks", args: { filter: "pending" } };
      }
      return null;
    },
  },
  {
    // "agregá tarea: revisar equipo" / "agrega todo comprar alcohol"
    scope: "tasks",
    test(n) {
      const m = n.match(
        /^agrega(?:r)?\s+(?:una?\s+)?(?:tarea|todo)[\s:\-]+(.+)$/,
      );
      if (!m) return null;
      const title = stripPunctuation(m[1]);
      if (title.length < 2) return null;
      return { action: "create_task", args: { title } };
    },
  },
  {
    // "marcá completada revisar equipo" / "marca terminada limpiar local"
    scope: "tasks",
    test(n) {
      const m = n.match(
        /^marca(?:r)?\s+(?:como\s+)?(?:completad[oa]|terminad[oa]|hecha?|done)\s+(.+)$/,
      );
      if (!m) return null;
      const titleOrId = stripPunctuation(m[1]);
      if (titleOrId.length < 2) return null;
      return { action: "complete_task", args: { titleOrId } };
    },
  },
  // ── CUSTOMERS / APPOINTMENTS ──────────────────────────────────────────────
  {
    // "última cita de juan perez"
    scope: "customers",
    test(n) {
      const m = n.match(
        /^(?:cuando\s+fue\s+)?(?:la\s+)?ultima\s+cita\s+de\s+(.+?)\??$/,
      );
      if (!m) return null;
      const name = stripPunctuation(m[1]);
      if (name.length < 2) return null;
      return { action: "query_customer", args: { name } };
    },
  },
  {
    // "cuántos clientes esta semana" / "cuántas citas hoy"
    scope: "customers",
    test(n) {
      const m = n.match(
        /^cuant[oa]s?\s+(clientes?|citas?|appointments?|turnos?)\s+(hoy|esta\s+semana|este\s+mes|tengo|tenemos)\??$/,
      );
      if (!m) return null;
      const noun = m[1];
      const period = /hoy|tengo|tenemos/.test(m[2]) ? "today" : "week";
      const type =
        noun.startsWith("client") || noun.startsWith("customer")
          ? "customers"
          : "appointments";
      return { action: "query_count", args: { type, period } };
    },
  },
  {
    // "confirmá la cita de pedro" / "confirma pedro"
    scope: "customers",
    test(n) {
      const m = n.match(
        /^confirma(?:r)?\s+(?:la\s+cita\s+de\s+|el\s+turno\s+de\s+|a\s+|de\s+)?(.+?)\.?$/,
      );
      if (!m) return null;
      const customerName = stripPunctuation(m[1]);
      // Need a sensible name — at least 2 chars, must contain a letter.
      if (customerName.length < 2 || !/[a-z]/.test(customerName)) return null;
      // Reject if the match is obviously a yes/no answer.
      if (/^(?:si|no|ok|esta|estan|todos|todas)$/.test(customerName)) return null;
      return { action: "confirm_appointment", args: { customerName } };
    },
  },
];

// ───── Public deterministic patterns ─────────────────────────────────────────

const PUBLIC_HOURS_KEYWORDS = [
  "horario",
  "horarios",
  "abierto",
  "abren",
  "cuando abren",
  "cuando cierran",
  "open",
  "hours",
  "schedule",
  "que hora abren",
  "estan abiertos",
] as const;

const PUBLIC_LOCATION_KEYWORDS = [
  "ubicacion",
  "ubicados",
  "direccion",
  "donde estan",
  "donde queda",
  "donde se encuentran",
  "address",
  "location",
  "where are",
  "como llego",
] as const;

const PUBLIC_PRICE_KEYWORDS = [
  "precio",
  "precios",
  "cuanto vale",
  "cuanto cuesta",
  "cost",
  "price",
] as const;

const PUBLIC_BOOKING_KEYWORDS = [
  "reservar",
  "reservar turno",
  "agendar",
  "agendar cita",
  "sacar turno",
  "sacar cita",
  "book",
  "booking",
  "appointment",
  "schedule appointment",
  "quiero reservar",
  "quiero un turno",
] as const;

function localiseBookingRedirect(lang: string | undefined, custom?: string): string {
  if (custom && custom.trim()) return custom.trim();
  switch (lang) {
    case "he":
      return 'כדי להזמין תור לחצו על כפתור "Book" בראש האתר. מערכת ההזמנות תלווה אתכם בבחירת שירות, איש צוות, יום ושעה.';
    case "ru":
      return 'Чтобы записаться на приём, нажмите кнопку "Book" в верхней части сайта. Система проведёт вас через выбор услуги, мастера, даты и времени.';
    default:
      return 'To book, click the "Book" button at the top of the site. The booking system will walk you through picking a service, choosing a staff member, and selecting a date and time.';
  }
}

function formatHoursAnswer(
  hours: PublicChatContext["hours"] | undefined,
  lang: string | undefined,
): string | null {
  if (!hours || typeof hours !== "object") return null;
  const lines: string[] = [];
  for (const [day, raw] of Object.entries(hours)) {
    if (!raw || typeof raw !== "object") continue;
    const slot = raw as { open?: string; close?: string; closed?: boolean };
    const label = slot.closed
      ? `${day}: ${lang === "he" ? "סגור" : lang === "ru" ? "закрыто" : "closed"}`
      : `${day}: ${slot.open ?? "?"} – ${slot.close ?? "?"}`;
    lines.push(`• ${label}`);
  }
  if (lines.length === 0) return null;
  const header =
    lang === "he"
      ? "שעות הפעילות שלנו:"
      : lang === "ru"
        ? "Наши часы работы:"
        : "Our business hours:";
  return `${header}\n${lines.join("\n")}`;
}

function formatLocationAnswer(
  contact: PublicChatContext["contact"] | undefined,
  lang: string | undefined,
): string | null {
  if (!contact || typeof contact !== "object") return null;
  const address = typeof contact.address === "string" ? contact.address.trim() : "";
  if (!address) return null;
  const header =
    lang === "he" ? "הכתובת שלנו:" : lang === "ru" ? "Наш адрес:" : "Our address:";
  return `${header} ${address}`;
}

function findServiceByName(
  services: PublicChatContext["services"] | undefined,
  query: string,
): { name: string; price?: string; duration?: string } | null {
  if (!Array.isArray(services) || services.length === 0) return null;
  const q = normalize(query);
  const cleaned = cleanItem(q);
  // Exact name match, accent-insensitive.
  const direct = services.find((s) => s?.name && normalize(s.name) === cleaned);
  if (direct?.name) {
    return {
      name: String(direct.name),
      price: typeof direct.price === "string" ? direct.price : undefined,
      duration: typeof direct.duration === "string" ? direct.duration : undefined,
    };
  }
  // Substring fallback (only if the query is reasonably specific).
  if (cleaned.length >= 3) {
    const sub = services.find(
      (s) => s?.name && normalize(s.name).includes(cleaned),
    );
    if (sub?.name) {
      return {
        name: String(sub.name),
        price: typeof sub.price === "string" ? sub.price : undefined,
        duration: typeof sub.duration === "string" ? sub.duration : undefined,
      };
    }
  }
  return null;
}

function formatPriceAnswer(
  services: PublicChatContext["services"] | undefined,
  query: string,
  lang: string | undefined,
): string | null {
  const svc = findServiceByName(services, query);
  if (!svc) return null;
  if (!svc.price) {
    return lang === "he"
      ? `המחיר של ${svc.name} זמין במערכת ההזמנה — לחצו על Book לפרטים.`
      : lang === "ru"
        ? `Цена на «${svc.name}» доступна в системе бронирования — нажмите Book.`
        : `The price for ${svc.name} is shown in the booking system — click Book to see details.`;
  }
  const lead =
    lang === "he"
      ? `המחיר של ${svc.name}: ${svc.price}`
      : lang === "ru"
        ? `Цена на «${svc.name}»: ${svc.price}`
        : `${svc.name}: ${svc.price}`;
  return svc.duration ? `${lead} (${svc.duration})` : lead;
}

// ───── Public matcher ────────────────────────────────────────────────────────

export function routePublicIntent(
  userMessage: string,
  ctx: PublicChatContext = {},
): PublicRouteResult {
  if (typeof userMessage !== "string" || userMessage.trim().length === 0) {
    return { kind: "model_full" };
  }
  const n = normalize(userMessage);

  // Booking — highest priority, always redirect.
  if (containsAny(n, PUBLIC_BOOKING_KEYWORDS)) {
    return {
      kind: "deterministic",
      scope: "booking",
      response: localiseBookingRedirect(ctx.uiLanguage, ctx.bookingRedirectMessage),
    };
  }

  // Hours
  if (containsAny(n, PUBLIC_HOURS_KEYWORDS)) {
    const text = formatHoursAnswer(ctx.hours, ctx.uiLanguage);
    if (text) return { kind: "deterministic", scope: "hours", response: text };
  }

  // Location
  if (containsAny(n, PUBLIC_LOCATION_KEYWORDS)) {
    const text = formatLocationAnswer(ctx.contact, ctx.uiLanguage);
    if (text) return { kind: "deterministic", scope: "location", response: text };
  }

  // Price of a specific service
  if (containsAny(n, PUBLIC_PRICE_KEYWORDS)) {
    // Strip only the trigger phrases so the remainder is the service name.
    // We keep words like "de" / "the" because service names often contain
    // them ("Corte de pelo", "The full set").
    let qPart = n;
    for (const kw of PUBLIC_PRICE_KEYWORDS) qPart = qPart.replace(kw, "");
    qPart = qPart.trim();
    const text = formatPriceAnswer(ctx.services, qPart, ctx.uiLanguage);
    if (text) return { kind: "deterministic", scope: "service_price", response: text };
  }

  return { kind: "model_full" };
}

// ───── Admin matcher ─────────────────────────────────────────────────────────

export function routeAdminIntent(userMessage: string): AdminRouteResult {
  const includeFullToolsDefault = false;
  if (typeof userMessage !== "string" || userMessage.trim().length === 0) {
    return {
      kind: "model_full",
      tools: [...ALL_ADMIN_TOOLS],
      includeSnapshot: false,
    };
  }

  const n = normalize(userMessage);
  const wc = wordCount(n);

  // Trivially short → bail to model_full so the model can ask a clarifying
  // question. We don't try to be clever with one-word inputs.
  if (wc < 3) {
    return {
      kind: "model_full",
      tools: [...ALL_ADMIN_TOOLS],
      includeSnapshot: wantsSnapshot(n),
    };
  }

  // Explanation / opinion-style queries — let the model handle.
  if (isAmbiguous(n)) {
    return {
      kind: "model_full",
      tools: [...ALL_ADMIN_TOOLS],
      includeSnapshot: wantsSnapshot(n),
    };
  }

  // Run all deterministic matchers. If exactly ONE matches, use it.
  // If multiple match, the message is multi-action; fall to the model.
  const hits: Array<{ matcher: AdminMatcher; result: AdminDeterministicAction }> = [];
  for (const m of ADMIN_MATCHERS) {
    const r = m.test(n);
    if (r) hits.push({ matcher: m, result: r });
  }

  const chainedConnector =
    /\s+y\s+(?:luego\s+|despues\s+|tambien\s+)?(?:agrega|marca|confirma|completa|completar|cancela|cancelar|registra|consume|consumi|consumir|usa|use|gasta|gaste|set|actualiza)/.test(
      n,
    );

  // Multi-action (more than one matcher fired, OR " y " followed by a second
  // imperative verb) → model_full so the model can sequence the steps.
  if (hits.length > 1 || (hits.length >= 1 && chainedConnector)) {
    return {
      kind: "model_full",
      tools: [...ALL_ADMIN_TOOLS],
      includeSnapshot: wantsSnapshot(n),
    };
  }

  if (hits.length === 1) {
    const only = hits[0];
    return {
      kind: "deterministic",
      scope: only.matcher.scope,
      ...only.result,
    } as AdminRouteResult;
  }

  // No deterministic hit. Pick a scope based on keywords and let the model
  // run with a reduced tool set.
  const snapshotWanted = wantsSnapshot(n);
  if (snapshotWanted) {
    // Snapshot keywords nearly always mean "give me a full picture" → general
    // scope so the model can pull any data through tools.
    return {
      kind: "model_with_scope",
      scope: "general",
      tools: SCOPE_TOOLS.general,
      includeSnapshot: true,
    };
  }

  const scope = detectAdminScope(n);
  if (scope === "general") {
    return {
      kind: "model_full",
      tools: [...ALL_ADMIN_TOOLS],
      includeSnapshot: includeFullToolsDefault,
    };
  }
  return {
    kind: "model_with_scope",
    scope,
    tools: SCOPE_TOOLS[scope],
    includeSnapshot: false,
  };
}

// ───── Stub action helper for the integration layer ──────────────────────────
//
// Several deterministic actions emitted by the admin router refer to tools
// that don't exist yet (stock, tasks). Integration code can call this to get
// a user-facing message in the right language without re-deriving the list.

// Stock actions (query_stock / set_stock / consume_stock) were removed from
// this set in Bloque I — the real executors live in src/lib/ai/stock-tools.ts
// and are dispatched by the chat handler. The remaining entries are still
// stubs awaiting Bloque J (tasks) and follow-up customer-lookup work.
const STUB_ACTIONS: ReadonlySet<string> = new Set([
  "set_stock",
  "list_tasks",
  "create_task",
  "complete_task",
  "query_customer",
  "query_count",
  "confirm_appointment",
]);

export function isStubAction(name: string): boolean {
  return STUB_ACTIONS.has(name);
}

export function stubActionMessage(action: string, lang?: string): string {
  const stockGroup =
    action === "query_stock" || action === "set_stock" || action === "consume_stock";
  const taskGroup =
    action === "list_tasks" || action === "create_task" || action === "complete_task";
  const customerGroup =
    action === "query_customer" ||
    action === "query_count" ||
    action === "confirm_appointment";

  const subject = stockGroup
    ? lang === "he"
      ? "ניהול מלאי"
      : lang === "ru"
        ? "учёт запасов"
        : "Stock management"
    : taskGroup
      ? lang === "he"
        ? "ניהול משימות"
        : lang === "ru"
          ? "управление задачами"
          : "Task tracking"
      : customerGroup
        ? lang === "he"
          ? "שאילתת לקוחות"
          : lang === "ru"
            ? "запрос клиентов"
            : "Customer lookup"
        : action;

  switch (lang) {
    case "he":
      return `${subject} עדיין לא זמין דרך הצ'אט. אני זיהיתי את הבקשה — היכולת תושק בקרוב.`;
    case "ru":
      return `${subject} пока недоступно через чат. Я распознал запрос — функция скоро появится.`;
    default:
      return `${subject} isn't wired through chat yet — I recognised the request, but the feature ships in an upcoming block.`;
  }
}
