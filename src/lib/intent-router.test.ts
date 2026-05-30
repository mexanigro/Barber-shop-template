/**
 * Functional tests for src/lib/intent-router.ts.
 *
 * Run with: npx tsx --test src/lib/intent-router.test.ts
 *
 * The router is pure (no I/O) so every case is a one-liner: call routeAdminIntent
 * / routePublicIntent and assert on the shape of the result. We cover every
 * deterministic pattern plus a handful of edge cases (typos, accents, mixed
 * caps, very-short inputs, multi-action conjunctions, ambiguous "why" queries).
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  routeAdminIntent,
  routePublicIntent,
  normalize,
  SCOPE_TOOLS,
  ALL_ADMIN_TOOLS,
  isStubAction,
  stubActionMessage,
} from "./intent-router.ts";

// ───── normalize() smoke tests ──────────────────────────────────────────────

describe("normalize", () => {
  test("strips accents and lowercases", () => {
    assert.equal(normalize("Cuánto desinfectante me quedá?"), "cuanto desinfectante me queda");
  });

  test("collapses whitespace and strips spanish punctuation", () => {
    assert.equal(normalize("  ¿Cuánto   vale  esto?  "), "cuanto vale esto");
  });

  test("handles empty input gracefully", () => {
    assert.equal(normalize(""), "");
  });
});

// ───── ADMIN deterministic patterns ──────────────────────────────────────────

describe("routeAdminIntent — deterministic stock patterns", () => {
  test("query_stock — accents stripped", () => {
    const r = routeAdminIntent("cuánto desinfectante me queda");
    assert.equal(r.kind, "deterministic");
    if (r.kind !== "deterministic") return;
    assert.equal(r.action, "query_stock");
    assert.equal(r.scope, "stock");
    assert.deepEqual(r.args, { itemName: "desinfectante" });
  });

  test("query_stock — variant 'cuánta cera tengo'", () => {
    const r = routeAdminIntent("cuanta cera tengo");
    assert.equal(r.kind, "deterministic");
    if (r.kind !== "deterministic") return;
    assert.equal(r.action, "query_stock");
    assert.deepEqual(r.args, { itemName: "cera" });
  });

  test("set_stock — 'me quedan 5 botellas'", () => {
    const r = routeAdminIntent("me quedan 5 botellas");
    assert.equal(r.kind, "deterministic");
    if (r.kind !== "deterministic") return;
    assert.equal(r.action, "set_stock");
    assert.deepEqual(r.args, { itemName: "botellas", count: 5 });
  });

  test("consume_stock — 'usé 3 cintas'", () => {
    const r = routeAdminIntent("usé 3 cintas");
    assert.equal(r.kind, "deterministic");
    if (r.kind !== "deterministic") return;
    assert.equal(r.action, "consume_stock");
    assert.deepEqual(r.args, { itemName: "cintas", count: 3 });
  });
});

describe("routeAdminIntent — deterministic task patterns", () => {
  test("list_tasks — bare 'pendientes'", () => {
    const r = routeAdminIntent("pendientes");
    // 1 word — too short, falls to model_full
    assert.equal(r.kind, "model_full");
  });

  test("list_tasks — 'tareas pendientes'", () => {
    const r = routeAdminIntent("tareas pendientes");
    // 2 words — still under wc<3 threshold; routes to model_full but on tasks
    // scope unless the threshold changes. Document expectation:
    assert.equal(r.kind, "model_full");
  });

  test("list_tasks — 'que tengo pendiente'", () => {
    const r = routeAdminIntent("que tengo pendiente");
    assert.equal(r.kind, "deterministic");
    if (r.kind !== "deterministic") return;
    assert.equal(r.action, "list_tasks");
    assert.equal(r.scope, "tasks");
    assert.deepEqual(r.args, { status: "pending" });
  });

  test("create_task — 'agregá tarea: revisar equipo de tatuar'", () => {
    const r = routeAdminIntent("agregá tarea: revisar equipo de tatuar");
    assert.equal(r.kind, "deterministic");
    if (r.kind !== "deterministic") return;
    assert.equal(r.action, "create_task");
    assert.equal(r.scope, "tasks");
    assert.deepEqual(r.args, { title: "revisar equipo de tatuar" });
  });

  test("complete_task — 'marcá completada limpiar local'", () => {
    const r = routeAdminIntent("marcá completada limpiar local");
    assert.equal(r.kind, "deterministic");
    if (r.kind !== "deterministic") return;
    assert.equal(r.action, "complete_task");
    assert.deepEqual(r.args, { titleOrFragment: "limpiar local" });
  });
});

describe("routeAdminIntent — deterministic customer/appointment patterns", () => {
  test("query_customer — 'última cita de juan perez'", () => {
    const r = routeAdminIntent("última cita de juan perez");
    assert.equal(r.kind, "deterministic");
    if (r.kind !== "deterministic") return;
    assert.equal(r.action, "query_customer");
    assert.equal(r.scope, "customers");
    assert.deepEqual(r.args, { name: "juan perez" });
  });

  test("query_count — 'cuántos clientes esta semana'", () => {
    const r = routeAdminIntent("cuántos clientes esta semana");
    assert.equal(r.kind, "deterministic");
    if (r.kind !== "deterministic") return;
    assert.equal(r.action, "query_count");
    assert.deepEqual(r.args, { type: "customers", period: "week" });
  });

  test("query_count — 'cuántas citas hoy'", () => {
    const r = routeAdminIntent("cuántas citas hoy");
    assert.equal(r.kind, "deterministic");
    if (r.kind !== "deterministic") return;
    assert.equal(r.action, "query_count");
    assert.deepEqual(r.args, { type: "appointments", period: "today" });
  });

  test("confirm_appointment — 'confirmá la cita de pedro'", () => {
    const r = routeAdminIntent("confirmá la cita de pedro");
    assert.equal(r.kind, "deterministic");
    if (r.kind !== "deterministic") return;
    assert.equal(r.action, "confirm_appointment");
    assert.deepEqual(r.args, { customerName: "pedro" });
  });
});

// ───── ADMIN fall-through cases ─────────────────────────────────────────────

describe("routeAdminIntent — model_full fall-through", () => {
  test("very-short input → model_full", () => {
    const r = routeAdminIntent("hola");
    assert.equal(r.kind, "model_full");
    if (r.kind !== "model_full") return;
    assert.deepEqual(r.tools, [...ALL_ADMIN_TOOLS]);
  });

  test("ambiguous 'por qué' question → model_full", () => {
    const r = routeAdminIntent("por qué se cancelaron tantos turnos esta semana");
    assert.equal(r.kind, "model_full");
  });

  test("'explicame' phrasing → model_full", () => {
    const r = routeAdminIntent("explicame qué hace el cluster IT");
    assert.equal(r.kind, "model_full");
  });

  test("multi-action conjunction → model_full", () => {
    // " y " connector between two imperatives triggers the multi-action heuristic.
    const r = routeAdminIntent("agregá tarea revisar equipo y marcá completada limpiar local");
    assert.equal(r.kind, "model_full");
  });
});

// ───── ADMIN scoped routing ────────────────────────────────────────────────

describe("routeAdminIntent — model_with_scope routing", () => {
  test("snapshot keyword → model_with_scope general + snapshot=true", () => {
    const r = routeAdminIntent("dame un resumen del día");
    assert.equal(r.kind, "model_with_scope");
    if (r.kind !== "model_with_scope") return;
    assert.equal(r.scope, "general");
    assert.equal(r.includeSnapshot, true);
    assert.deepEqual(r.tools, SCOPE_TOOLS.general);
  });

  test("stock scope keyword → narrow tools", () => {
    const r = routeAdminIntent("quería avisar que se rompió el frasco de alcohol");
    assert.equal(r.kind, "model_with_scope");
    if (r.kind !== "model_with_scope") return;
    assert.equal(r.scope, "stock");
    assert.deepEqual(r.tools, SCOPE_TOOLS.stock);
    assert.equal(r.includeSnapshot, false);
  });

  test("customer scope keyword → customer tools", () => {
    const r = routeAdminIntent("mostrame los clientes que faltaron al turno");
    assert.equal(r.kind, "model_with_scope");
    if (r.kind !== "model_with_scope") return;
    assert.equal(r.scope, "customers");
    assert.deepEqual(r.tools, SCOPE_TOOLS.customers);
  });

  test("no scope keywords + not deterministic → model_full", () => {
    const r = routeAdminIntent("creo que tendríamos que repensar la estrategia general");
    assert.equal(r.kind, "model_full");
  });
});

// ───── ADMIN edge cases ────────────────────────────────────────────────────

describe("routeAdminIntent — edge cases", () => {
  test("MIXED CAPS still routes correctly", () => {
    const r = routeAdminIntent("CUÁNTO Desinfectante Me Queda");
    assert.equal(r.kind, "deterministic");
  });

  test("trailing question mark accepted", () => {
    const r = routeAdminIntent("cuánto shampoo me queda?");
    assert.equal(r.kind, "deterministic");
  });

  test("whitespace padding does not break match", () => {
    const r = routeAdminIntent("   agregá tarea: comprar guantes   ");
    assert.equal(r.kind, "deterministic");
    if (r.kind !== "deterministic") return;
    assert.equal(r.args && (r.args as { title?: string }).title, "comprar guantes");
  });

  test("empty string → model_full with full toolset", () => {
    const r = routeAdminIntent("");
    assert.equal(r.kind, "model_full");
    if (r.kind !== "model_full") return;
    assert.equal(r.tools.length, ALL_ADMIN_TOOLS.length);
  });

  test("non-matching pattern with stock keyword → stock scope", () => {
    const r = routeAdminIntent("avisame cuando se acabe el stock de algo");
    assert.equal(r.kind, "model_with_scope");
    if (r.kind !== "model_with_scope") return;
    assert.equal(r.scope, "stock");
  });
});

// ───── PUBLIC router ───────────────────────────────────────────────────────

describe("routePublicIntent — booking redirect", () => {
  test("English: booking keyword → deterministic redirect", () => {
    const r = routePublicIntent("I want to book an appointment", { uiLanguage: "en" });
    assert.equal(r.kind, "deterministic");
    if (r.kind !== "deterministic") return;
    assert.equal(r.scope, "booking");
    assert.match(r.response, /Book/);
  });

  test("Spanish: 'quiero reservar' → booking redirect", () => {
    const r = routePublicIntent("quiero reservar un turno", { uiLanguage: "en" });
    assert.equal(r.kind, "deterministic");
    if (r.kind !== "deterministic") return;
    assert.equal(r.scope, "booking");
  });

  test("Hebrew localised redirect", () => {
    const r = routePublicIntent("I want to book", { uiLanguage: "he" });
    assert.equal(r.kind, "deterministic");
    if (r.kind !== "deterministic") return;
    assert.match(r.response, /Book/); // brand button label stays in English
  });
});

describe("routePublicIntent — hours", () => {
  test("returns formatted hours when ctx has them", () => {
    const r = routePublicIntent("cuándo abren?", {
      uiLanguage: "en",
      hours: {
        Monday: { open: "09:00", close: "18:00" },
        Sunday: { closed: true },
      },
    });
    assert.equal(r.kind, "deterministic");
    if (r.kind !== "deterministic") return;
    assert.equal(r.scope, "hours");
    assert.match(r.response, /Monday/);
    assert.match(r.response, /09:00/);
    assert.match(r.response, /closed/);
  });

  test("no hours configured → falls to model", () => {
    const r = routePublicIntent("cuándo abren?", { uiLanguage: "en" });
    assert.equal(r.kind, "model_full");
  });
});

describe("routePublicIntent — location", () => {
  test("returns address when configured", () => {
    const r = routePublicIntent("dónde están ubicados?", {
      uiLanguage: "en",
      contact: { address: "Calle Falsa 123" },
    });
    assert.equal(r.kind, "deterministic");
    if (r.kind !== "deterministic") return;
    assert.equal(r.scope, "location");
    assert.match(r.response, /Calle Falsa 123/);
  });

  test("missing address → fall to model", () => {
    const r = routePublicIntent("dónde están?", { uiLanguage: "en", contact: {} });
    assert.equal(r.kind, "model_full");
  });
});

describe("routePublicIntent — service price", () => {
  test("finds price by service name", () => {
    const r = routePublicIntent("cuánto vale corte de pelo?", {
      uiLanguage: "en",
      services: [{ name: "Corte de pelo", price: "$25", duration: "30 min" }],
    });
    assert.equal(r.kind, "deterministic");
    if (r.kind !== "deterministic") return;
    assert.equal(r.scope, "service_price");
    assert.match(r.response, /\$25/);
  });

  test("unknown service → model_full", () => {
    const r = routePublicIntent("cuánto cuesta el masaje tailandés?", {
      uiLanguage: "en",
      services: [{ name: "Corte de pelo", price: "$25" }],
    });
    assert.equal(r.kind, "model_full");
  });
});

// ───── stub action helper ─────────────────────────────────────────────────

describe("isStubAction / stubActionMessage", () => {
  test("identifies remaining stub actions (tasks + lookup + set_stock)", () => {
    // After Bloque I, query_stock + consume_stock + add_stock have real
    // executors and are no longer stubs. set_stock (absolute count) is still
    // pending and stays in STUB_ACTIONS.
    assert.equal(isStubAction("query_stock"), false);
    assert.equal(isStubAction("consume_stock"), false);
    assert.equal(isStubAction("set_stock"), true);
    assert.equal(isStubAction("create_task"), true);
    assert.equal(isStubAction("query_count"), true);
    assert.equal(isStubAction("walk_in"), false);
    assert.equal(isStubAction("book_appointment"), false);
  });

  test("message localises by language", () => {
    const en = stubActionMessage("set_stock", "en");
    const he = stubActionMessage("set_stock", "he");
    const ru = stubActionMessage("set_stock", "ru");
    assert.notEqual(en, he);
    assert.notEqual(en, ru);
    assert.match(en, /Stock/);
    assert.match(he, /מלאי/);
    assert.match(ru, /запас/);
  });
});
