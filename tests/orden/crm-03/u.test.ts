// CRM-03 · U1 (T) · el equipo entra: empleada y gerente (D-305). Sesión A (2026-10-15): test rojo.
//
// Medido: el panel deja pasar sólo `siteConfig.adminEmail` (`ProtectedRoute.tsx:53-63`, `admin-auth.ts:17-22`): una invitada ve
// «הגישה נדחתה». La entrada nueva pregunta `GET /api/admin/me` (lo responde este test) y el menú sale de `pestanasDeRol`.
import { test } from "node:test";
import assert from "node:assert/strict";
import { conCrm, conModulos, PESTANAS_DUENA } from "./_crm.ts";

const EMPLEADA = { email: "empleada@example.com", uid: "uid-empleada" };
const PESTANAS_EMPLEADA = ["תורים", "לקוחות", "משימות", "מלאי", "תיבת דואר"];
const CLAVES_DUENA = ["overview", "missions", "payments", "customers", "personnel", "tasks", "stock", "users", "inbox", "logs", "rules", "support"];
const CLAVES_EMPLEADA = ["missions", "customers", "tasks", "stock", "inbox"];

/** Las entradas del menú, en orden, por su texto. */
const MENU = `(() => {
  const nombres = ${JSON.stringify(PESTANAS_DUENA.concat("ידע"))};
  return [...document.querySelectorAll("button, a")].map((b) => (b.textContent || "").trim()).filter((t) => nombres.includes(t)).filter((t, i, s) => s.indexOf(t) === i);
})()`;

test("invitar al equipo: una empleada invitada (GET /api/admin/me responde role \"staff\") entra al panel con su Google y ve exactamente תורים, לקוחות, משימות, מלאי y תיבת דואר; una gerente ve las pestañas de la dueña; quien no está invitado ve que no tiene acceso; y src/lib/admin-users.ts exporta pestanasDeRol, que da esas listas", async () => {
  const fallas: string[] = [];
  await conModulos(async (cargar) => {
    const m = await cargar("src/lib/admin-users.ts");
    if (typeof m?.pestanasDeRol !== "function") fallas.push("src/lib/admin-users.ts exporta pestanasDeRol (D-305)");
    else {
      if (JSON.stringify(m.pestanasDeRol("staff")) !== JSON.stringify(CLAVES_EMPLEADA)) fallas.push(`pestanasDeRol("staff") = ${JSON.stringify(CLAVES_EMPLEADA)} (hoy ${JSON.stringify(m.pestanasDeRol("staff"))})`);
      for (const r of ["manager", "owner"]) if (JSON.stringify(m.pestanasDeRol(r)) !== JSON.stringify(CLAVES_DUENA)) fallas.push(`pestanasDeRol("${r}") = las doce de la dueña (hoy ${JSON.stringify(m.pestanasDeRol(r))})`);
    }
  });
  await conCrm(async (crm) => {
    for (const [rol, esperado] of [["staff", PESTANAS_EMPLEADA], ["manager", PESTANAS_DUENA]] as const) {
      const a = await crm.abrir({ vista: "escritorio", usuario: EMPLEADA, rol, oPantallaSinAcceso: true, api: (met, ruta) => (met === "GET" && ruta.startsWith("/api/admin/me") ? { status: 200, json: { role: rol, status: "active", email: EMPLEADA.email } } : undefined) });
      try {
        const negado = await a.page.evaluate(() => document.body.innerText.includes("הגישה נדחתה"));
        if (negado) { fallas.push(`${rol}: una invitada (GET /api/admin/me 200, role ${rol}) entra al panel; hoy ve «הגישה נדחתה»`); continue; }
        const menu = await a.page.evaluate(MENU);
        if (JSON.stringify(menu) !== JSON.stringify(esperado)) fallas.push(`${rol}: el menú es ${esperado.join(", ")} (hoy ${menu.join(", ")})`);
      } finally { await a.cerrar(); }
    }
    const n = await crm.abrir({ vista: "escritorio", usuario: { email: "otra@example.com", uid: "uid-otra" }, oPantallaSinAcceso: true, api: (met, ruta) => (met === "GET" && ruta.startsWith("/api/admin/me") ? { status: 403, json: { error: "Forbidden" } } : undefined) });
    try {
      if (!(await n.page.evaluate(() => document.body.innerText.includes("הגישה נדחתה")))) fallas.push("quien no está invitado (GET /api/admin/me 403) ve «הגישה נדחתה»");
      if (await n.page.evaluate(MENU).then((m: string[]) => m.length > 0)) fallas.push("quien no está invitado no ve el menú");
    } finally { await n.cerrar(); }
  });
  assert.deepEqual(fallas, [], `el equipo entra:\n${fallas.join("\n")}`);
});
