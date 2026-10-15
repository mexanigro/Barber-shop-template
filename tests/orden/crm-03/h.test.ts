// CRM-03 · H1, H2 (T) · el editor de horarios «sumamente intuitivo» (D-303). Sesión A (2026-10-15): tests rojos.
//
// Medido: cambiar de persona descarta lo editado sin preguntar (`StaffLogistics.tsx:158-163`); no hay cómo copiar un día a la semana
// ni vista previa; una fecha de `blockedDates` se pinta como día libre y no se puede liberar («ללא חריגה» sólo borra dateOverrides;
// `handleToggleBlockedDate` nadie lo llama); la fecha de una excepción
// sale en inglés (`:419`); guardar copia a config sin transacción (`db.ts:399-401`). CRM-02 dejó: domingo a sábado, lo guardado
// cargado (staff_overrides), la inicial sin foto y la copia a config.staff: se vigilan acá.
import { test } from "node:test";
import assert from "node:assert/strict";
import { conCrm, medirPantalla, quieta, tocar, CLIENTE, salon } from "./_crm.ts";

const DIAS = ["יום ראשון", "יום שני", "יום שלישי", "יום רביעי", "יום חמישי", "יום שישי", "שבת"];

/** El salón con un horario guardado en el CRM para la primera persona: el domingo de 10:00 a 18:00 (distinto del config). */
function conGuardado() {
  const d = salon();
  const cfg = d[`config/${CLIENTE}`];
  const p = cfg.staff[0];
  d[`staff_overrides/${CLIENTE}_${p.id}`] = { clientId: CLIENTE, staffId: p.id, schedule: { ...p.schedule, sunday: { isOpen: true, hours: { start: "10:00", end: "18:00" }, breaks: [] } }, blockedDates: ["2026-10-25"], dateOverrides: {} };
  return { d, p, otros: cfg.staff.slice(1) };
}

/** El input de hora `i` (0 inicio, 1 fin) de la tarjeta de un día, marcado para un locator. */
const marcarHora = (dia: string, i: number) => `(() => {
  const et = [...document.querySelectorAll("*")].find((e) => e.children.length === 0 && (e.textContent || "").trim() === ${JSON.stringify(dia)} && e.getBoundingClientRect().width > 0);
  for (let p = et && et.parentElement; p; p = p.parentElement) { const ins = p.querySelectorAll("input[type=time]"); if (ins.length >= 2) { ins[${i}].setAttribute("data-crm03", "hora"); return ins[${i}].value; } }
  return null;
})()`;
const leerHora = (dia: string, i: number) => marcarHora(dia, i);

test("el editor de horarios, «sumamente intuitivo»: muestra los días de domingo a sábado con lo guardado de cada persona (y la inicial de quien no tiene foto); «העתקה לכל הימים» copia las horas y las pausas de un día a los otros días abiertos; cambiar de persona con cambios sin guardar abre un aviso (alertdialog) y «ביטול» los conserva; guardar escribe en staff_overrides y, en una transacción, en config del cliente sólo schedule, blockedDates y dateOverrides de esa persona, y muestra «נשמר»; y a 390 cada control mide 44 × 44", async () => {
  const fallas: string[] = [];
  const { d, p, otros } = conGuardado();
  await conCrm(async (crm) => {
    const a = await crm.abrir({ vista: "telefono", datos: d });
    try {
      await a.ir("צוות");
      await tocar(a.page, p.name.split(" ")[0]);
      const orden = await a.page.evaluate((dias: string[]) => [...document.querySelectorAll("*")].filter((e) => e.children.length === 0 && dias.includes((e.textContent ?? "").trim()) && e.getBoundingClientRect().width > 0).map((e) => (e.textContent ?? "").trim()), DIAS);
      if (orden.join() !== DIAS.join()) fallas.push(`CRM-02: los días de domingo a sábado (hoy: ${orden.join(", ")})`);
      if ((await a.page.evaluate(leerHora("יום ראשון", 0))) !== "10:00") fallas.push("CRM-02: el editor carga lo guardado (el domingo de la primera persona empieza 10:00)");
      const inicial = await a.page.evaluate((nombre: string) => [...document.querySelectorAll("button")].some((b) => (b.textContent ?? "").includes(nombre.split(" ")[0]) && !b.querySelector("img") && [...b.querySelectorAll("span")].some((s) => (s.textContent ?? "").trim() === nombre.charAt(0))), otros[1].name);
      if (!inicial) fallas.push(`CRM-02: ${otros[1].name}, sin foto, aparece con su inicial`);
      const chicos = (await medirPantalla(a.page)).chicos;
      if (chicos.length) fallas.push(`a 390 cada control del editor mide 44 × 44 (${chicos.length} más chicos: ${chicos.slice(0, 3).join("; ")})`);

      // Copiar el domingo a los otros días abiertos.
      await a.page.evaluate(marcarHora("יום ראשון", 0));
      await a.page.locator("[data-crm03=hora]").fill("08:00");
      await a.page.evaluate(() => document.querySelector("[data-crm03=hora]")?.removeAttribute("data-crm03"));
      if (!(await tocar(a.page, "העתקה לכל הימים"))) fallas.push("hay «העתקה לכל הימים»");
      else {
        const lunes = await a.page.evaluate(leerHora("יום שני", 0));
        if (lunes !== "08:00") fallas.push(`«העתקה לכל הימים» copia el domingo a los otros días abiertos (el lunes empieza ${lunes})`);
      }
      // Cambiar de persona con cambios sin guardar.
      await tocar(a.page, otros[0].name.split(" ")[0]);
      const aviso = await a.page.evaluate(() => [...document.querySelectorAll("[role=alertdialog]")].some((x) => x.getBoundingClientRect().width > 0));
      if (!aviso) fallas.push("cambiar de persona con cambios sin guardar abre un aviso (role=alertdialog)");
      else {
        await tocar(a.page, "ביטול", "[role=alertdialog]");
        if ((await a.page.evaluate(leerHora("יום ראשון", 0))) !== "08:00") fallas.push("«ביטול» conserva lo editado (el domingo sigue en 08:00)");
      }
      // Guardar.
      if (!(await tocar(a.page, "שמירת לוח זמנים"))) fallas.push("hay «שמירת לוח זמנים»");
      else {
        await a.page.waitForFunction(() => ((globalThis as any).__CRM03.escrituras as any[]).some((e) => e.ruta?.startsWith("config/")), null, { timeout: 15000 }).catch(() => {});
        const esc = await a.escrituras();
        const ov = esc.find((e) => e.ruta === `staff_overrides/${CLIENTE}_${p.id}`);
        if (!ov || ov.datos?.schedule?.sunday?.hours?.start !== "08:00") fallas.push("guardar escribe el horario en staff_overrides");
        const cfg = esc.find((e) => e.ruta === `config/${CLIENTE}`);
        if (!cfg) fallas.push("CRM-02: guardar copia el horario a config del cliente");
        else {
          if (!cfg.tx) fallas.push("la copia a config del cliente va en una transacción");
          const doc = await a.documento(`config/${CLIENTE}`);
          const esta = doc.staff.find((s: any) => s.id === p.id);
          if (esta?.schedule?.sunday?.hours?.start !== "08:00") fallas.push("config.staff tiene el horario nuevo de esa persona");
          const cambiados = Object.keys(esta ?? {}).filter((k) => !["schedule", "blockedDates", "dateOverrides"].includes(k) && JSON.stringify(esta[k]) !== JSON.stringify((p as any)[k]));
          if (cambiados.length) fallas.push(`sólo cambian schedule, blockedDates y dateOverrides de esa persona (cambió: ${cambiados.join(", ")})`);
          for (const o of otros) if (JSON.stringify(doc.staff.find((s: any) => s.id === o.id)) !== JSON.stringify(o)) fallas.push(`las otras personas no cambian (${o.name})`);
        }
        await quieta(a.page);
        const ok = await a.page.evaluate(() => [...document.querySelectorAll("[role=status]")].some((x) => (x.textContent ?? "").includes("נשמר") && x.getBoundingClientRect().width > 0));
        if (!ok) fallas.push("después de guardar se ve «נשמר» (role=status)");
      }
    } finally { await a.cerrar(); }
  });
  assert.deepEqual(fallas, [], `el editor de horarios:\n${fallas.join("\n")}`);
});

test("el día libre con un toque y la vista previa: tocar una fecha del calendario del editor ofrece «יום חופש» y «שעות מיוחדות» con la fecha escrita en hebreo, y guardar escribe ese dateOverrides; una fecha de blockedDates se ve como día libre y «ללא חריגה» la libera; y la vista previa de la reserva muestra, para la fecha elegida, exactamente las horas que la clienta verá con lo guardado —las de generateSlots con ese horario—, ninguna en un día libre", async () => {
  const fallas: string[] = [];
  const { d, p } = conGuardado();
  await conCrm(async (crm) => {
    const booking = await crm.vite.ssrLoadModule("/src/lib/booking.ts");
    const cfg = d[`config/${CLIENTE}`];
    const guardado = { ...p, ...d[`staff_overrides/${CLIENTE}_${p.id}`] };
    const esperadas: string[] = booking.generateSlots(new Date(2026, 9, 18), guardado, cfg.services[0], []);
    assert.ok(esperadas.length > 0, `precondición: generateSlots da horas el domingo 18 con lo guardado (${esperadas.join(" ")})`);
    const a = await crm.abrir({ vista: "telefono", datos: d });
    try {
      await a.ir("צוות");
      await tocar(a.page, p.name.split(" ")[0]);
      // La fecha bloqueada (25, de blockedDates) se libera con «ללא חריגה».
      if (!(await tocar(a.page, "25"))) fallas.push("el calendario del editor tiene el día 25");
      else if (!(await tocar(a.page, "ללא חריגה"))) fallas.push("una fecha elegida ofrece «ללא חריגה»");
      if (!(await tocar(a.page, "18"))) fallas.push("el calendario del editor tiene el día 18");
      const opciones = await a.page.evaluate(() => ["יום חופש", "שעות מיוחדות"].filter((t) => [...document.querySelectorAll("button")].some((b) => (b.textContent ?? "").trim() === t && b.getBoundingClientRect().width > 0)));
      if (opciones.length !== 2) fallas.push(`tocar una fecha ofrece «יום חופש» y «שעות מיוחדות» (hoy: ${opciones.join(", ")})`);
      const ingles = await a.page.evaluate(() => (document.body.innerText.match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\b/gi) ?? []));
      if (ingles.length) fallas.push(`la fecha elegida, escrita en hebreo (hoy: ${[...new Set(ingles)].join(", ")})`);
      const region = () => a.page.evaluate(() => {
        const r = [...document.querySelectorAll("[aria-label], [role=region]")].find((x) => (x.getAttribute("aria-label") ?? "").includes("תצוגה מקדימה של ההזמנה"));
        return r ? [...new Set((r.textContent ?? "").match(/\b\d{2}:\d{2}\b/g) ?? [])] : null;
      });
      const antes = await region();
      if (!antes) fallas.push("hay una vista previa de la reserva («תצוגה מקדימה של ההזמנה»)");
      else if (antes.join() !== esperadas.join()) fallas.push(`la vista previa del 18 muestra las horas de generateSlots con lo guardado (esperadas ${esperadas.join(" ")}; hoy ${antes.join(" ")})`);
      if (opciones.includes("יום חופש")) {
        await tocar(a.page, "יום חופש");
        await tocar(a.page, "שמירת לוח זמנים");
        await a.page.waitForFunction(() => ((globalThis as any).__CRM03.escrituras as any[]).some((e) => e.ruta?.startsWith("staff_overrides/")), null, { timeout: 15000 });
        const ov = (await a.escrituras()).filter((e) => e.ruta === `staff_overrides/${CLIENTE}_${p.id}`).pop();
        if (ov?.datos?.dateOverrides?.["2026-10-18"]?.type !== "dayOff") fallas.push("guardar escribe dateOverrides[2026-10-18] = dayOff");
        if ((ov?.datos?.blockedDates ?? []).includes("2026-10-25") || ov?.datos?.dateOverrides?.["2026-10-25"]) fallas.push(`«ללא חריגה» libera la fecha bloqueada 2026-10-25 (blockedDates guardado: ${JSON.stringify(ov?.datos?.blockedDates)})`);
        await quieta(a.page);
        const despues = await region();
        if (despues && despues.length) fallas.push(`en un día libre la vista previa no muestra horas (hoy: ${despues.join(" ")})`);
      }
    } finally { await a.cerrar(); }
  });
  assert.deepEqual(fallas, [], `el día libre y la vista previa:\n${fallas.join("\n")}`);
});
