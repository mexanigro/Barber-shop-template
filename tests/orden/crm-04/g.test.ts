// CRM-04 · G1–G5 (T) · cómo le hablamos a cada persona (R31, D-338, D-339, D-350; prototipo 5). Sesión A (2026-10-20): tests rojos.
//
// Medido en T 47b53a6: la ficha y Clientes hablan de toda la clientela en femenino («נוספה», «התורים שלה», «עוד לא הגיעה»), no hay
// «לשון הפנייה» ni en la ficha ni en «תור חדש», `customerService.upsertByEmail` no lleva `trato` y las reglas de `customers` aceptan
// cualquier valor. G4 usa la lista de `diseno/crm-04/genero.cjs` (sobre el texto visible y fuera de los datos); G5 evalúa las reglas
// con `_reglas.ts` (sin emulador).
/* eslint-disable @typescript-eslint/no-explicit-any */
import { test } from "node:test";
import assert from "node:assert/strict";
import { CLAVES, CLIENTE, campo, conCrm, palabrasDeDatos, quieta, salon, tocar, type Idioma } from "./_crm.ts";
import { leerReglas, permitido } from "./_reglas.ts";
import { fuente } from "./_comun.ts";

async function paso(fallas: string[], que: string, fn: () => Promise<void>) {
  try { await fn(); } catch (e) { fallas.push(`${que}: ${String((e as Error)?.message ?? e).split("\n")[0]}`); }
}
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
/** Una forma de la tabla de G como expresión: `{d}` es la fecha (algo que no es espacio); «…» es «lo que sigue». */
const forma = (f: string) => new RegExp(esc(f).replace("\\{d\\}", "\\S").replace(/…/g, ""));

/** Abre la ficha de `nombre` desde Clientes (la etapa elegida, o la que la muestra) y devuelve su texto, sus títulos y los placeholders. */
async function ficha(page: any, nombre: string): Promise<{ texto: string; titulos: string[]; placeholders: string[] } | null> {
  const ok = await page.evaluate((n: string) => {
    const t = [...document.querySelectorAll("#admin-content *")].find((e) => !e.closest("#admin-content > aside") && !e.closest("[role=dialog]") && e.children.length === 0 && (e.textContent ?? "").trim() === n && e.getBoundingClientRect().width > 0);
    if (!t) return false;
    ((t.closest("button, a, [role=button], li, article") as HTMLElement | null) ?? (t as HTMLElement)).click();
    return true;
  }, nombre);
  if (!ok) return null;
  await quieta(page);
  return page.evaluate(() => {
    const d = [...document.querySelectorAll("[role=dialog]")].find((x) => x.getBoundingClientRect().width > 0) as HTMLElement | undefined;
    if (!d) return null;
    return { texto: d.innerText, titulos: [...d.querySelectorAll("h2, h3, h4")].map((h) => (h.textContent ?? "").trim()), placeholders: [...d.querySelectorAll("textarea, input")].map((e) => e.getAttribute("placeholder") ?? "") };
  });
}
async function cerrarFicha(page: any) {
  await page.keyboard.press("Escape");
  await quieta(page);
  await page.evaluate(() => { const d = [...document.querySelectorAll("[role=dialog]")].find((x) => x.getBoundingClientRect().width > 0); (d?.querySelector("button[aria-label]") as HTMLElement | null)?.click(); });
  await quieta(page);
}
/** El texto de la tarjeta de Clientes de `nombre`: el contenedor más chico con su nombre y otra línea. */
const NOMBRES = ["גלית", "יוסי", "טל", "ליאת", "רוני", "מיכל"];
const TARJETA = (nombre: string) => `(() => {
  // El contenedor más grande que tiene su nombre y ningún otro nombre del salón: la tarjeta entera.
  const otros = ${JSON.stringify(NOMBRES)}.filter((n) => n !== ${JSON.stringify(nombre)});
  const h = [...document.querySelectorAll("#admin-content *")].find((e) => !e.closest("#admin-content > aside") && !e.closest("[role=dialog]") && e.children.length === 0 && (e.textContent || "").trim() === ${JSON.stringify(nombre)} && e.getBoundingClientRect().width > 0);
  let card = h;
  for (let p = h && h.parentElement; p && p.id !== "admin-content"; p = p.parentElement) { const ls = p.innerText.split("\\n").map((l) => l.trim()); if (otros.some((o) => ls.includes(o))) break; card = p; }
  return card ? card.innerText : null;
})()`;

/** La tabla de G1 (`segun` en `crm03/textos-pantallas.ts`, P5). */
type Formas = { f: string; m: string; n: string };
const TABLA: Record<Idioma, { alta?: Formas; turnos?: Formas; sin?: Formas; notas?: Formas; noVino?: Formas }> = {
  he: {
    alta: { f: "נוספה {d}", m: "נוסף {d}", n: "ברשימה מ־{d}" },
    turnos: { f: "התורים שלה", m: "התורים שלו", n: "תורים" },
    sin: { f: "עוד אין תורים שתואמים לפרטים שלה.", m: "עוד אין תורים שתואמים לפרטים שלו.", n: "עוד אין תורים שתואמים לפרטים האלה." },
    notas: { f: "מה חשוב לזכור עליה: ", m: "מה חשוב לזכור עליו: ", n: "מה חשוב לזכור: " },
    noVino: { f: "עוד לא הגיעה", m: "עוד לא הגיע", n: "עוד אין ביקור" },
  },
  en: {
    turnos: { f: "Her bookings", m: "His bookings", n: "Bookings" },
    sin: { f: "her details", m: "his details", n: "these details" },
    notas: { f: "about her", m: "about him", n: "Things to remember: " },
  },
  ru: {
    alta: { f: "Добавлена {d}", m: "Добавлен {d}", n: "В списке с {d}" },
    turnos: { f: "Её записи", m: "Его записи", n: "Записи" },
    noVino: { f: "Ещё не приходила", m: "Ещё не приходил", n: "Визитов пока нет" },
  },
  ar: {
    alta: { f: "أُضيفت {d}", m: "أُضيف {d}", n: "في القائمة منذ {d}" },
    turnos: { f: "مواعيدها", m: "مواعيده", n: "المواعيد" },
    noVino: { f: "لم تأتِ بعد", m: "لم يأتِ بعد", n: "لا زيارات بعد" },
  },
};
/** Las personas del salón con CRM04_TRATO: גלית "f", יוסי "m", טל sin el campo. */
const PERSONAS: [string, "f" | "m" | "n"][] = [["גלית", "f"], ["יוסי", "m"], ["טל", "n"]];
/** «עוד לא הגיע» está dentro de «עוד לא הגיעה» (y «Ещё не приходил» en «Ещё не приходила»): la forma masculina no sigue con ה / а. */
const tiene = (texto: string, f: string, trato: string) => (trato === "m" ? new RegExp(`${forma(f).source}(?![הа])`).test(texto) : forma(f).test(texto));

test("la ficha de una clienta con trato \"f\", la de un cliente con \"m\" y la de alguien con \"n\" o sin el campo muestran, en he, en, ru y ar, las formas de la tabla de G (fecha de alta, «sus turnos», «sin turnos que coincidan», el ejemplo de notas) y la tarjeta de Clientes la de «todavía no vino»", async () => {
  const fallas: string[] = [];
  await conCrm(async (crm) => {
    for (const idioma of ["he", "en", "ru", "ar"] as Idioma[]) {
      await paso(fallas, idioma, async () => {
        const a = await crm.abrir({ vista: "telefono", idioma, trato: true });
        try {
          await a.irA("customers");
          const t = TABLA[idioma];
          for (const [nombre, trato] of PERSONAS) {
            if (t.noVino) {
              const tarjeta: string | null = await a.page.evaluate(TARJETA(nombre));
              if (!tarjeta) fallas.push(`${idioma} · Clientes muestra la tarjeta de ${nombre}`);
              else if (!tiene(tarjeta, t.noVino[trato], trato)) fallas.push(`${idioma} · la tarjeta de ${nombre} (${trato}) dice «${t.noVino[trato]}» (hoy «${tarjeta.replace(/\s+/g, " ").slice(0, 80)}»)`);
            }
            const f = await ficha(a.page, nombre);
            if (!f) { fallas.push(`${idioma} · tocar ${nombre} abre su ficha`); continue; }
            if (t.alta && !tiene(f.texto, t.alta[trato], trato)) fallas.push(`${idioma} · la ficha de ${nombre} (${trato}) dice «${t.alta[trato]}»`);
            if (t.turnos && !f.titulos.includes(t.turnos[trato])) fallas.push(`${idioma} · la ficha de ${nombre} (${trato}) titula «${t.turnos[trato]}» (títulos: ${f.titulos.join(" | ")})`);
            if (t.sin && !f.texto.includes(t.sin[trato])) fallas.push(`${idioma} · la ficha de ${nombre} (${trato}) dice «${t.sin[trato]}»`);
            if (t.notas && !f.placeholders.some((p) => p.includes(t.notas![trato]))) fallas.push(`${idioma} · el ejemplo de notas de ${nombre} (${trato}) dice «${t.notas[trato]}» (hoy ${JSON.stringify(f.placeholders.filter(Boolean))})`);
            await cerrarFicha(a.page);
          }
        } finally { await a.cerrar(); }
      });
    }
  });
  assert.deepEqual(fallas, [], `G1 · las formas por trato:\n${fallas.join("\n")}`);
});

/** El grupo «לשון הפנייה» (o su par) de un diálogo: su nombre, sus botones y cuál está marcado. */
const GRUPO_TRATO = (etiqueta: string) => `(() => {
  const d = [...document.querySelectorAll("[role=dialog]")].find((x) => x.getBoundingClientRect().width > 0);
  if (!d) return null;
  const nombre = (g) => (g.getAttribute("aria-label") || (g.getAttribute("aria-labelledby") || "").split(/\\s+/).map((id) => (document.getElementById(id) || {}).textContent || "").join(" ")).trim();
  const g = [...d.querySelectorAll("[role=group]")].find((x) => nombre(x) === ${JSON.stringify(etiqueta)});
  if (!g) return { nombres: [...d.querySelectorAll("[role=group]")].map(nombre) };
  const bs = [...g.querySelectorAll("button")];
  return { botones: bs.map((b) => (b.textContent || "").trim()), presionados: bs.filter((b) => b.getAttribute("aria-pressed") === "true").map((b) => (b.textContent || "").trim()), todosPressed: bs.every((b) => b.hasAttribute("aria-pressed")) };
})()`;
const TRATO: Record<Idioma, { label: string; f: string; m: string; n: string }> = {
  he: { label: "לשון הפנייה", f: "נקבה", m: "זכר", n: "בלי לציין" },
  en: { label: "Refer to this person as", f: "She", m: "He", n: "Not set" },
  ru: { label: "Как писать об этом человеке", f: "Она", m: "Он", n: "Не указано" },
  ar: { label: "صيغة الحديث عن هذا الشخص", f: "مؤنث", m: "مذكر", n: "دون تحديد" },
};

test("la ficha tiene el grupo «לשון הפנייה» con tres botones `aria-pressed` («נקבה», «זכר», «בלי לציין», con sus pares en en, ru y ar), marcado según el trato; tocar uno escribe `trato` con `customerService.updateCustomer` y, si la escritura falla, la ficha vuelve al trato anterior y muestra un `role=\"alert\"`", async () => {
  const fallas: string[] = [];
  await conCrm(async (crm) => {
    for (const idioma of ["he", "en", "ru", "ar"] as Idioma[]) {
      await paso(fallas, idioma, async () => {
        const a = await crm.abrir({ vista: "telefono", idioma, trato: true });
        try {
          await a.irA("customers");
          const T = TRATO[idioma];
          for (const [nombre, trato] of PERSONAS) {
            if (!(await ficha(a.page, nombre))) { fallas.push(`${idioma} · tocar ${nombre} abre su ficha`); continue; }
            const g = await a.page.evaluate(GRUPO_TRATO(T.label));
            if (!g?.botones) fallas.push(`${idioma} · la ficha de ${nombre} tiene el grupo «${T.label}» (grupos: ${JSON.stringify(g?.nombres ?? [])})`);
            else {
              if (JSON.stringify(g.botones) !== JSON.stringify([T.f, T.m, T.n]) || !g.todosPressed) fallas.push(`${idioma} · el grupo tiene «${T.f}», «${T.m}», «${T.n}» con aria-pressed (hoy ${JSON.stringify(g.botones)})`);
              if (JSON.stringify(g.presionados) !== JSON.stringify([T[trato]])) fallas.push(`${idioma} · en la ficha de ${nombre} está marcado «${T[trato]}» (hoy ${JSON.stringify(g.presionados)})`);
            }
            if (idioma === "he" && nombre === "גלית" && g?.botones) {
              // Tocar «זכר»: escribe trato "m" en ese cliente con updateCustomer (un update del SDK).
              await tocar(a.page, T.m, "[role=dialog]");
              await a.page.waitForFunction(() => ((globalThis as any).__CRM03.escrituras as any[]).some((e) => e.op === "update" && e.ruta.startsWith("customers/") && e.datos?.trato === "m"), null, { timeout: 15000 }).catch(() => {});
              const esc = (await a.escrituras()).filter((e) => e.ruta === `customers/${CLIENTE}_galit` && e.datos?.trato !== undefined);
              if (esc.length !== 1 || esc[0].op !== "update" || esc[0].datos.trato !== "m") fallas.push(`he · tocar «זכר» escribe trato "m" en customers/${CLIENTE}_galit con updateCustomer (escrituras: ${JSON.stringify(esc)})`);
              if (JSON.stringify((await a.page.evaluate(GRUPO_TRATO(T.label)))?.presionados) !== JSON.stringify([T.m])) fallas.push("he · después de tocar «זכר» está marcado «זכר»");
              // Si la escritura falla, vuelve al anterior («זכר») y avisa.
              await a.page.evaluate(() => { (globalThis as any).__CRM03.fallar = ["^customers/"]; });
              await tocar(a.page, T.n, "[role=dialog]");
              await a.page.waitForFunction(() => [...document.querySelectorAll("[role=dialog] [role=alert]")].some((x) => x.getBoundingClientRect().width > 0), null, { timeout: 15000 }).catch(() => {});
              const tras = await a.page.evaluate(GRUPO_TRATO(T.label));
              const alerta = await a.page.evaluate(() => [...document.querySelectorAll("[role=dialog] [role=alert]")].some((x) => x.getBoundingClientRect().width > 0));
              if (JSON.stringify(tras?.presionados) !== JSON.stringify([T.m])) fallas.push(`he · si la escritura falla, la ficha vuelve a «זכר» (hoy ${JSON.stringify(tras?.presionados)})`);
              if (!alerta) fallas.push("he · si la escritura falla, la ficha muestra un role=\"alert\"");
              await a.page.evaluate(() => { (globalThis as any).__CRM03.fallar = []; });
            }
            await cerrarFicha(a.page);
          }
        } finally { await a.cerrar(); }
      });
    }
  });
  assert.deepEqual(fallas, [], `G2 · «לשון הפנייה» en la ficha:\n${fallas.join("\n")}`);
});

test("«תור חדש» trae el mismo grupo, marcado en «בלי לציין»; con \"f\" o \"m\" el contacto se guarda con ese trato, y con \"n\" no se escribe `trato`, así un turno nuevo no le borra el trato a alguien que ya lo tenía", async () => {
  const fallas: string[] = [];
  await conCrm(async (crm) => {
    await paso(fallas, "he", async () => {
      const a = await crm.abrir({ vista: "escritorio" });
      try {
        await a.irA("missions");
        /** Un «תור חדש» de visita con ese nombre, teléfono y trato; devuelve la escritura del contacto (ruta y datos) o null. */
        const nuevo = async (nombre: string, tel: string, trato: "f" | "m" | "n", mirarGrupo = false) => {
          if (!(await tocar(a.page, "תור חדש"))) { fallas.push("«תור חדש» en Turnos"); return null; }
          const g = await a.page.evaluate(GRUPO_TRATO("לשון הפנייה"));
          if (!g?.botones) { fallas.push(`«תור חדש» trae el grupo «לשון הפנייה» (grupos: ${JSON.stringify(g?.nombres ?? [])})`); await a.page.keyboard.press("Escape"); await quieta(a.page); return null; }
          if (mirarGrupo) {
            if (JSON.stringify(g.botones) !== JSON.stringify(["נקבה", "זכר", "בלי לציין"]) || !g.todosPressed) fallas.push(`el grupo de «תור חדש» tiene «נקבה», «זכר», «בלי לציין» con aria-pressed (hoy ${JSON.stringify(g.botones)})`);
            if (JSON.stringify(g.presionados) !== JSON.stringify(["בלי לציין"])) fallas.push(`«תור חדש» empieza marcado en «בלי לציין» (hoy ${JSON.stringify(g.presionados)})`);
          }
          await tocar(a.page, "רישום ביקור", "[role=dialog]");
          const n = await campo(a.page, "שם", "[role=dialog]"), t = await campo(a.page, "טלפון", "[role=dialog]");
          if (!n || !t) { fallas.push("«תור חדש» pide «שם» y «טלפון»"); return null; }
          await n.fill(nombre); await t.fill(tel);
          await tocar(a.page, { f: "נקבה", m: "זכר", n: "בלי לציין" }[trato], "[role=dialog]");
          const antes = (await a.escrituras()).length;
          const guardar = await a.page.evaluate(() => { const d = [...document.querySelectorAll("[role=dialog]")].find((x) => x.getBoundingClientRect().width > 0)!; const bs = [...d.querySelectorAll("button")].filter((b) => !(b as HTMLButtonElement).disabled && b.getBoundingClientRect().width > 0); const b = bs[bs.length - 1] as HTMLElement | undefined; b?.click(); return (b?.textContent ?? "").trim(); });
          await a.page.waitForFunction(([k, tl]: [number, string]) => ((globalThis as any).__CRM03.escrituras as any[]).slice(k).some((e) => e.ruta.startsWith("customers/") && (e.datos?.phone === tl || e.op === "update")), [antes, tel], { timeout: 15000 }).catch(() => {});
          await quieta(a.page);
          const esc = (await a.escrituras()).slice(antes).filter((e) => e.ruta.startsWith("customers/"));
          if (!esc.length) { fallas.push(`guardar «${guardar}» con ${tel} escribe el contacto`); return null; }
          await a.page.keyboard.press("Escape"); await quieta(a.page);
          return esc[esc.length - 1];
        };
        const f = await nuevo("בדיקה אחת", "050-111-1111", "f", true);
        if (f) {
          if (f.datos?.trato !== "f") fallas.push(`con «נקבה» el contacto se guarda con trato "f" (${f.op} ${JSON.stringify(f.datos?.trato)})`);
          const otra = await nuevo("בדיקה אחת", "050-111-1111", "n");
          if (otra) {
            if (otra.ruta !== f.ruta) fallas.push(`el segundo turno con el mismo teléfono escribe el mismo contacto (${otra.ruta} ≠ ${f.ruta})`);
            if (otra.datos && "trato" in otra.datos) fallas.push(`con «בלי לציין» no se escribe trato (se escribió ${JSON.stringify(otra.datos.trato)})`);
            const doc = await a.documento(f.ruta);
            if (doc?.trato !== "f") fallas.push(`un turno nuevo con «בלי לציין» no le borra el trato a quien lo tenía (queda ${JSON.stringify(doc?.trato)})`);
          }
        }
        const m = await nuevo("בדיקה שתיים", "050-222-2222", "m");
        if (m && m.datos?.trato !== "m") fallas.push(`con «זכר» el contacto se guarda con trato "m" (${m.op} ${JSON.stringify(m.datos?.trato)})`);
      } finally { await a.cerrar(); }
    });
  });
  assert.deepEqual(fallas, [], `G3 · «לשון הפנייה» en «תור חדש»:\n${fallas.join("\n")}`);
});

/** La lista de G (la de `diseno/crm-04/genero.cjs`). */
const LISTA: Record<"he" | "ru" | "ar", { palabras: string[]; frases?: string[]; raices?: string[] }> = {
  he: { palabras: ["לקוחה", "הגיעה", "שלחי", "בדקי", "נסי", "היכנסי", "בקשי", "עובדת", "מנהלת", "נסה", "בדוק", "התחבר", "כתוב", "בחר"], frases: ["זו את", "אף אחת", "כל אחת"] },
  ru: { palabras: ["приглашена", "добавлена"], raices: ["клиентк", "сотрудниц", "владелиц", "управляющ"] },
  ar: { palabras: ["زبونة", "زبونات", "اللواتي", "موظفة", "مديرة", "مالكة", "لكِ", "اختر", "تحقق", "حاول", "اكتب"] },
};

test("con el salón de prueba (clientela sin trato), ninguna pestaña del panel a 390 en he, ru ni ar muestra un texto que suponga el género de quien no se conoce, según la lista de G", async () => {
  const fallas: string[] = [];
  const datos = salon();
  const deDatos = new Set(palabrasDeDatos(datos));
  await conCrm(async (crm) => {
    for (const idioma of ["he", "ru", "ar"] as const) {
      await paso(fallas, idioma, async () => {
        const a = await crm.abrir({ vista: "telefono", idioma, datos });
        try {
          for (const k of CLAVES) {
            await a.irA(k);
            const textos: string[] = await a.page.evaluate(() => {
              const out: string[] = [];
              const it = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
              for (let n = it.nextNode(); n; n = it.nextNode()) {
                const t = (n.textContent ?? "").trim(); const el = n.parentElement;
                if (!t || !el || el.closest("select, option, script, style, template")) continue;
                const r = el.getBoundingClientRect(); if (r.width < 1 || r.height < 1) continue;
                let vis = true; for (let p: Element | null = el; p; p = p.parentElement) { const cs = getComputedStyle(p); if (cs.display === "none" || cs.visibility === "hidden") { vis = false; break; } }
                if (vis) out.push(t);
              }
              return out;
            });
            const L = LISTA[idioma];
            for (const t of textos) {
              const hallados: string[] = [];
              if (idioma === "he") {
                const ws = (t.match(/[\u05D0-\u05EA]+/g) ?? []).filter((w) => !deDatos.has(w));
                for (const w of ws) for (const p of L.palabras) if (w === p || (w.length === p.length + 1 && "והשבלמכ".includes(w[0]) && w.slice(1) === p)) hallados.push(w);
                for (const f of L.frases!) if (new RegExp(`(^|[^\\u05D0-\\u05EA])${f}($|[^\\u05D0-\\u05EA])`).test(t)) hallados.push(f);
              } else if (idioma === "ru") {
                const ws = t.toLowerCase().match(/[а-яё]+/g) ?? [];
                for (const w of ws) { if (L.palabras.includes(w)) hallados.push(w); for (const r of L.raices!) if (w.startsWith(r)) hallados.push(w); }
              } else {
                const ws = t.match(/[\u0600-\u06FF]+/g) ?? [];
                for (const w of ws) for (const p of L.palabras) if (w === p || ((w.startsWith("و") || w.startsWith("ف")) && w.slice(1) === p)) hallados.push(w);
              }
              if (hallados.length) fallas.push(`${idioma} ${k} · «${hallados.join("», «")}» en «${t.slice(0, 70)}»`);
            }
          }
        } finally { await a.cerrar(); }
      });
    }
  });
  assert.deepEqual([...new Set(fallas)], [], `G4 · textos que suponen el género:\n${[...new Set(fallas)].join("\n")}`);
});

test("las reglas de `customers` aceptan `trato` sólo con \"f\", \"m\" o \"n\" en create y en update, y `customerService.upsertByEmail` y `updateCustomer` lo aceptan", async () => {
  const fallas: string[] = [];
  // Las reglas, evaluadas (sin emulador): la dueña del tenant c1.
  try {
    const reglas = leerReglas(fuente("firestore.rules"));
    const auth = { uid: "u1", token: { clientId: "c1", tenantRole: "owner", email: "duena@example.com", email_verified: true } };
    const docs = { "clients/c1": { status: "active" } };
    const guardado = { clientId: "c1", email: "a@example.com", fullName: "א", phone: "050-000-0001", stage: "lead", notes: "", tags: [] as string[], createdAt: { __ts: 1 }, updatedAt: { __ts: 1 } };
    const crear = (trato?: unknown) => permitido(reglas, "create", "customers/c1_a", { auth, docs, datos: { ...guardado, ...(trato === undefined ? {} : { trato }) } });
    const actualizar = (trato: unknown) => permitido(reglas, "update", "customers/c1_a", { auth, docs, guardado, datos: { ...guardado, trato, updatedAt: { __ts: 2 } } });
    for (const t of ["f", "m", "n"]) {
      if (!crear(t)) fallas.push(`reglas · create con trato "${t}" se acepta`);
      if (!actualizar(t)) fallas.push(`reglas · update con trato "${t}" se acepta`);
    }
    if (!crear()) fallas.push("reglas · create sin trato se acepta (los datos que ya existen no se tocan)");
    for (const t of ["x", "F", "", 1, null, ["f"]]) {
      if (crear(t)) fallas.push(`reglas · create con trato ${JSON.stringify(t)} se rechaza`);
      if (actualizar(t)) fallas.push(`reglas · update con trato ${JSON.stringify(t)} se rechaza`);
    }
  } catch (e) { fallas.push(`reglas · ${(e as Error).message}`); }
  // Los servicios del CRM, en el navegador (con el Firestore en memoria).
  await conCrm(async (crm) => {
    await paso(fallas, "servicios", async () => {
      const a = await crm.abrir({ vista: "escritorio" });
      try {
        const r = await a.page.evaluate(async () => {
          const ruta = "/src/services/customers.ts"; const { customerService } = await import(ruta);
          const W = (globalThis as any).__CRM03;
          const desde = W.escrituras.length;
          const id = await customerService.upsertByEmail({ email: "trato-g5@example.com", fullName: "בדיקה", phone: "050-555-5555", trato: "m" } as any);
          await customerService.upsertByEmail({ email: "trato-g5@example.com", fullName: "בדיקה", phone: "050-555-5555", trato: "f" } as any);
          await customerService.updateCustomer(id, { trato: "n" } as any);
          return { id, escrituras: (W.escrituras as any[]).slice(desde).map((e) => ({ op: e.op, ruta: e.ruta, trato: e.datos?.trato })) };
        });
        const [alta, otra, upd] = r.escrituras;
        if (alta?.op !== "set" || alta.trato !== "m") fallas.push(`upsertByEmail de alguien nuevo con trato "m" lo escribe (${JSON.stringify(alta)})`);
        if (otra?.op !== "update" || otra.trato !== "f") fallas.push(`upsertByEmail de alguien que ya está, con trato "f", lo escribe (${JSON.stringify(otra)})`);
        if (upd?.op !== "update" || upd.trato !== "n") fallas.push(`updateCustomer con trato "n" lo escribe (${JSON.stringify(upd)})`);
      } finally { await a.cerrar(); }
    });
  });
  assert.deepEqual(fallas, [], `G5 · trato en las reglas y en los servicios:\n${fallas.join("\n")}`);
});
