// CRM-04 · I1–I8 (T) · el panel en los cuatro idiomas (D-334, D-335, D-337). Sesión A (2026-10-20): tests rojos.
//
// Medido en T 47b53a6 (el arnés de esta orden, `_crm.ts`): en en a 390 la agenda, el Resumen, Pagos, Equipo, Inventario, Usuarios y el
// Registro muestran texto del panel en hebreo («היום», «חודש», «30 יום», «הכל שמור», «מוצרים», «בעלים», «נשלח»…); las flechas de
// «siguiente» están dibujadas para hebreo; Clientes dice «לידים», «הומר», «אבוד»; el Registro muestra el error del proveedor crudo;
// Tareas promete «שאילתת העוזר». Con el parche de los prototipos (`diseno/crm-04/PROTO-5-acumulado.patch` + `crm03/textos*.ts`) pasan.
/* eslint-disable @typescript-eslint/no-explicit-any */
import { test } from "node:test";
import assert from "node:assert/strict";
import { CLAVES, CLIENTE, abrirMenu, conCrm, digitos, flechas, hebreoDelPanel, palabrasDeDatos, quieta, salon, vistaCalendario, type Idioma, type Vista } from "./_crm.ts";

const OTROS: Idioma[] = ["en", "ru", "ar"];
const SIGUIENTE = "next|הבא|следующ|التالي";
const ANTERIOR = "prev|קודם|предыдущ|السابق";
const VOLVER = "back to|חזרה|назад|К сообщениям|العودة";
const resumir = (xs: string[]) => `${xs.slice(0, 4).join(" | ")}${xs.length > 4 ? ` (+${xs.length - 4})` : ""}`;
/** Un paso que no puede romper la corrida: si lanza, queda como falla (el test cae por su aserción, nunca por un error suelto). */
async function paso(fallas: string[], que: string, fn: () => Promise<void>) {
  try { await fn(); } catch (e) { fallas.push(`${que}: ${String((e as Error)?.message ?? e).split("\n")[0]}`); }
}

test("en en, ru y ar cada pestaña del panel a 390 y a 1280 no muestra ningún texto del panel en hebreo: las letras hebreas que se ven son sólo datos del salón de prueba (nombres, servicios, productos y asuntos)", async () => {
  const fallas: string[] = [];
  const palabras = palabrasDeDatos(salon());
  await conCrm(async (crm) => {
    for (const idioma of OTROS) for (const vista of ["telefono", "escritorio"] as Vista[]) {
      await paso(fallas, `${idioma} ${vista}`, async () => {
        const a = await crm.abrir({ vista, idioma });
        try {
          for (const k of CLAVES) {
            await a.irA(k);
            const h = await hebreoDelPanel(a.page, palabras);
            if (h.length) fallas.push(`${idioma} ${vista} ${k} · ${h.length} textos en hebreo: ${resumir(h)}`);
          }
        } finally { await a.cerrar(); }
      });
    }
  });
  assert.deepEqual(fallas, [], `I1 · texto del panel en hebreo en en/ru/ar:\n${fallas.join("\n")}`);
});

test("los plurales y las fechas van por el idioma: «1 запись», «2 записи», «5 записей»; «موعد واحد», «موعدان», «3 مواعيد»; la fecha de la agenda en inglés es «Thursday, October 15th» y ningún texto de en, ru o ar mezcla un mes inglés con una letra hebrea («15 בOctober»)", async () => {
  const fallas: string[] = [];
  // El mes con días de 1, 2, 3 y 5 turnos (el 20, 21, 23 y 22 de octubre).
  const datos = salon();
  const staff = datos[`config/${CLIENTE}`].staff.map((s: any) => s.id);
  let n = 0;
  for (const [fecha, cuantos] of [["2026-10-20", 1], ["2026-10-21", 2], ["2026-10-22", 5], ["2026-10-23", 3]] as const) {
    for (let i = 0; i < cuantos; i++) datos[`appointments/p${++n}`] = { clientId: CLIENTE, customerName: "נועה", customerEmail: `p${n}@example.com`, customerPhone: "050-000-0000", serviceId: "cut", staffId: staff[i % 3], date: fecha, time: `${String(9 + i).padStart(2, "0")}:00`, duration: 60, status: "confirmed", paymentStatus: "pending", type: "appointment", createdAt: { __ts: Date.parse("2026-10-10T09:00:00+03:00") } };
  }
  const ESPERADO: Record<string, string[]> = { ru: ["1 запись", "2 записи", "5 записей"], ar: ["موعد واحد", "موعدان", "3 مواعيد"] };
  const MESES = "January|February|March|April|May|June|July|August|September|October|November|December";
  const mezcla = new RegExp(`[\\u05D0-\\u05EA](${MESES})|(${MESES})[\\u05D0-\\u05EA]`);
  await conCrm(async (crm) => {
    for (const idioma of OTROS) {
      await paso(fallas, idioma, async () => {
        const a = await crm.abrir({ vista: "escritorio", idioma, datos });
        try {
          await a.irA("missions");
          if (idioma === "en") {
            const fecha = await a.page.evaluate(() => document.body.innerText.includes("Thursday, October 15th"));
            if (!fecha) fallas.push(`en · la fecha de la agenda es «Thursday, October 15th» (hoy: ${await a.page.evaluate(() => (document.querySelector("main h3, #admin-content h3")?.textContent ?? "").trim())})`);
          }
          if (ESPERADO[idioma]) {
            if (!(await vistaCalendario(a.page, 0))) fallas.push(`${idioma} · Turnos tiene la vista calendario por mes`);
            else {
              const textos = digitos(await a.page.evaluate(() => [...document.querySelectorAll("#admin-content *")].map((e) => `${e.getAttribute("aria-label") ?? ""}`).join("\n") + "\n" + document.body.innerText));
              const faltan = ESPERADO[idioma].filter((p) => !new RegExp(`(^|[^\\d])${p}`).test(textos));
              if (faltan.length) fallas.push(`${idioma} · el mes dice ${faltan.map((p) => `«${p}»`).join(", ")} en los días con 1, 2, ${idioma === "ru" ? 5 : 3} turnos`);
            }
          }
          for (const k of CLAVES) {
            await a.irA(k);
            const t = await a.page.evaluate(() => document.body.innerText);
            const m = t.match(mezcla);
            if (m) fallas.push(`${idioma} ${k} · mezcla un mes inglés con una letra hebrea: «${t.slice(Math.max(0, (m.index ?? 0) - 10), (m.index ?? 0) + 20)}»`);
          }
        } finally { await a.cerrar(); }
      });
    }
  });
  assert.deepEqual(fallas, [], `I2 · plurales y fechas por idioma:\n${fallas.join("\n")}`);
});

test("en en y ru el ícono de «siguiente» de la agenda, del calendario (mes, semana y día) y de las páginas del Registro apunta a la derecha y el de «volver» de Mensajes a la izquierda; en he y ar al revés", async () => {
  const fallas: string[] = [];
  const datos = salon();
  for (let i = 0; i < 45; i++) datos[`notification_logs/x${i}`] = { clientId: CLIENTE, channel: "email", recipient: `x${i}@example.com`, subject: "תזכורת", type: "reminder", status: "sent", refId: `x${i}`, createdAt: { __ts: Date.parse("2026-10-14T18:00:00+03:00") - i * 60000 } };
  await conCrm(async (crm) => {
    for (const idioma of ["en", "ru", "he", "ar"] as Idioma[]) {
      const ltr = idioma === "en" || idioma === "ru";
      const adelante = ltr ? "derecha" : "izquierda", atras = ltr ? "izquierda" : "derecha";
      const juzgar = (donde: string, fs: { nombre: string; sentido: string | null }[], esperado: string) => {
        if (!fs.length) fallas.push(`${idioma} · ${donde}: no hay un control con flecha`);
        for (const f of fs) if (f.sentido !== esperado) fallas.push(`${idioma} · ${donde} «${f.nombre}» apunta a la ${f.sentido ?? "?"} (debe: ${esperado})`);
      };
      await paso(fallas, `${idioma} escritorio`, async () => {
        const a = await crm.abrir({ vista: "escritorio", idioma, datos });
        try {
          await a.irA("missions");
          juzgar("agenda · siguiente", await flechas(a.page, SIGUIENTE, "#admin-content"), adelante);
          juzgar("agenda · anterior", await flechas(a.page, ANTERIOR, "#admin-content"), atras);
          for (const [i, vista] of ["mes", "semana", "día"].entries()) {
            if (!(await vistaCalendario(a.page, i as 0 | 1 | 2))) { fallas.push(`${idioma} · Turnos tiene la vista calendario por ${vista}`); continue; }
            juzgar(`calendario ${vista} · siguiente`, await flechas(a.page, SIGUIENTE, "#admin-content"), adelante);
          }
          await a.irA("logs");
          juzgar("Registro · página siguiente", await flechas(a.page, SIGUIENTE, "#admin-content"), adelante);
        } finally { await a.cerrar(); }
      });
      await paso(fallas, `${idioma} 390`, async () => {
        const a = await crm.abrir({ vista: "telefono", idioma, datos });
        try {
          await a.irA("inbox");
          const abierto = await a.page.evaluate(() => {
            const t = [...document.querySelectorAll("#admin-content *")].find((e) => !e.closest("#admin-content > aside") && e.children.length === 0 && (e.textContent ?? "").includes("שעות פתיחה") && e.getBoundingClientRect().width > 0);
            const b = t?.closest("button, a, [role=button], li, article") as HTMLElement | null;
            (b ?? (t as HTMLElement | undefined))?.click();
            return !!t;
          });
          await quieta(a.page);
          if (!abierto) fallas.push(`${idioma} · Mensajes muestra el mensaje «שעות פתיחה»`);
          juzgar("Mensajes · volver", await flechas(a.page, VOLVER, "#admin-content"), atras);
        } finally { await a.cerrar(); }
      });
    }
  });
  assert.deepEqual(fallas, [], `I3 · el sentido de las flechas:\n${fallas.join("\n")}`);
});

test("un nombre en hebreo dentro de una frase en otro idioma va en `<bdi>`: el de la clienta en la pregunta de cancelar y en la nota de cambiar la hora, y el del producto en la línea de stock bajo", async () => {
  const fallas: string[] = [];
  const nombres = ["גלית", "מיכל", "נועה", "רוני", "דנה"];
  /** ¿Hay en el diálogo abierto un `<bdi>` cuyo texto es el nombre de una clienta del día? */
  const bdiEnDialogo = `(() => { const d = [...document.querySelectorAll("[role=dialog], [role=alertdialog]")].find((x) => x.getBoundingClientRect().width > 0); if (!d) return null; return [...d.querySelectorAll("bdi")].map((b) => (b.textContent || "").trim()); })()`;
  await conCrm(async (crm) => {
    for (const idioma of OTROS) {
      await paso(fallas, idioma, async () => {
        const a = await crm.abrir({ vista: "telefono", idioma });
        try {
          await a.irA("missions");
          // Cancelar: el menú «…» del primer turno y su última opción.
          const menu = await a.page.evaluate(() => { const b = document.querySelector("#admin-content button[aria-haspopup=menu]") as HTMLElement | null; b?.click(); return !!b; });
          await quieta(a.page);
          const cancelar = menu && (await a.page.evaluate(() => { const b = [...document.querySelectorAll("[role=menu] button, [role=menu] [role=menuitem]")].pop() as HTMLElement | undefined; b?.click(); return !!b; }));
          await quieta(a.page);
          const enCancelar: string[] | null = cancelar ? await a.page.evaluate(bdiEnDialogo) : null;
          if (!enCancelar) fallas.push(`${idioma} · el menú «…» de un turno abre la pregunta de cancelar`);
          else if (!enCancelar.some((t) => nombres.includes(t))) fallas.push(`${idioma} · la pregunta de cancelar lleva el nombre de la clienta en <bdi> (bdi: ${JSON.stringify(enCancelar)})`);
          await a.page.keyboard.press("Escape"); await quieta(a.page);
          // Cambiar la hora: el botón con el ícono de reloj del primer turno.
          const mover = await a.page.evaluate(() => { const b = [...document.querySelectorAll("#admin-content button")].find((x) => x.querySelector("svg.lucide-clock") && x.getBoundingClientRect().width > 0) as HTMLElement | undefined; b?.click(); return !!b; });
          await quieta(a.page);
          const enMover: string[] | null = mover ? await a.page.evaluate(bdiEnDialogo) : null;
          if (!enMover) fallas.push(`${idioma} · un turno ofrece cambiar la hora (botón con reloj) y abre su diálogo`);
          else if (!enMover.some((t) => nombres.includes(t))) fallas.push(`${idioma} · la nota de cambiar la hora lleva el nombre de la clienta en <bdi> (bdi: ${JSON.stringify(enMover)})`);
          await a.page.keyboard.press("Escape"); await quieta(a.page);
          // Stock bajo: «חמצן 6%» (2 de mínimo 5).
          await a.irA("stock");
          const stock = await a.page.evaluate(() => [...document.querySelectorAll("#admin-content bdi")].map((b) => (b.textContent || "").trim()));
          if (!stock.includes("חמצן 6%")) fallas.push(`${idioma} · la línea de stock bajo lleva «חמצן 6%» en <bdi> (bdi: ${JSON.stringify(stock)})`);
        } finally { await a.cerrar(); }
      });
    }
  });
  assert.deepEqual(fallas, [], `I4 · nombres en hebreo dentro de otra lengua:\n${fallas.join("\n")}`);
});

test("Clientes habla sin jerga: las etapas son he «פניות · בקשר · עם תור · לקוחות · הפסיקו להגיע», en «New · In touch · Booked · Clients · Not returning», ru «Новые · На связи · Записаны · Клиенты · Не вернутся» y ar «استفسارات · على تواصل · بموعد · زبائن · توقّفت الزيارات»; ninguna se corta a 390, y ningún texto visible de Clientes dice «לידים», «הומר», «אבוד», «עملاء محتملون» ni «arrastrar» en ningún idioma", async () => {
  const fallas: string[] = [];
  const ETAPAS: Record<Idioma, string[]> = {
    he: ["פניות", "בקשר", "עם תור", "לקוחות", "הפסיקו להגיע"],
    en: ["New", "In touch", "Booked", "Clients", "Not returning"],
    ru: ["Новые", "На связи", "Записаны", "Клиенты", "Не вернутся"],
    ar: ["استفسارات", "على تواصل", "بموعد", "زبائن", "توقّفت الزيارات"],
  };
  // La jerga, en cualquier idioma: «עملاء محتملون» de la hoja es «عملاء محتملون» (su primera letra salió hebrea); «arrastrar» es
  // arrastrar en cada idioma (el arrastre no anda en el celular, P4).
  const JERGA = /לידים|הומר|אבוד|عملاء محتملون|גרר|גרירה|\bdrag|перетащ|перетаскив|اسحب/i;
  await conCrm(async (crm) => {
    for (const idioma of ["he", "en", "ru", "ar"] as Idioma[]) {
      for (const vista of ["telefono", "escritorio"] as Vista[]) {
        await paso(fallas, `${idioma} ${vista}`, async () => {
          const a = await crm.abrir({ vista, idioma });
          try {
            await a.irA("customers");
            const r = await a.page.evaluate(() => {
              const main = document.querySelector("main") ?? document.querySelector("#admin-content")!;
              const tabs = [...main.querySelectorAll("[role=tablist] [role=tab]")].filter((t) => t.getBoundingClientRect().width > 0);
              const cortadas = tabs.filter((t) => { const r = t.getBoundingClientRect(); const desb = [t, ...t.querySelectorAll("*")].some((e) => (e as HTMLElement).scrollWidth > (e as HTMLElement).clientWidth + 1 && getComputedStyle(e).overflow !== "visible"); return desb || r.left < -1 || r.right > innerWidth + 1; }).map((t) => (t.textContent ?? "").trim());
              const nombre = (t: Element) => [...t.childNodes].filter((n) => n.nodeType === 3 || !(n as Element).matches?.("[aria-hidden=true], .tabular-nums, [data-cuenta]")).map((n) => (n.textContent ?? "")).join(" ").replace(/[\d\u0660-\u0669]+/g, "").replace(/\s+/g, " ").trim();
              return { etapas: tabs.map(nombre), cortadas, texto: (main as HTMLElement).innerText };
            });
            // Las cuatro primeras son las pestañas a 390 y las columnas a 1280 (la quinta, «הפסיקו להגיע», sólo con su filtro, como en CRM-03).
            if (vista === "telefono") {
              if (JSON.stringify(r.etapas) !== JSON.stringify(ETAPAS[idioma].slice(0, 4))) fallas.push(`${idioma} 390 · las pestañas de etapa son «${ETAPAS[idioma].slice(0, 4).join(" · ")}» (hoy «${r.etapas.join(" · ")}»)`);
              if (r.cortadas.length) fallas.push(`${idioma} 390 · ninguna etapa se corta (cortadas: ${r.cortadas.join(", ")})`);
            } else {
              const faltan = ETAPAS[idioma].slice(0, 4).filter((e) => !r.texto.includes(e));
              if (faltan.length) fallas.push(`${idioma} 1280 · las columnas nombran ${faltan.map((e) => `«${e}»`).join(", ")}`);
            }
            const m = r.texto.match(JERGA);
            if (m) fallas.push(`${idioma} ${vista} · Clientes dice «${m[0]}»`);
            // Las cinco, en el selector de etapa de la ficha (גלית).
            const f = await a.page.evaluate(() => {
              const t = [...document.querySelectorAll("#admin-content *")].find((e) => !e.closest("#admin-content > aside") && e.children.length === 0 && (e.textContent ?? "").trim() === "גלית" && e.getBoundingClientRect().width > 0);
              if (!t) return null;
              ((t.closest("button, a, [role=button], li, article") as HTMLElement | null) ?? (t as HTMLElement)).click();
              return true;
            });
            await quieta(a.page);
            const ficha = f ? await a.page.evaluate(() => {
              const d = [...document.querySelectorAll("[role=dialog]")].find((x) => x.getBoundingClientRect().width > 0) as HTMLElement | undefined;
              if (!d) return null;
              const g = [...d.querySelectorAll("[role=group]")].find((x) => x.querySelectorAll("button[aria-pressed]").length === 5);
              const bs = g ? [...g.querySelectorAll("button")] : [];
              const cortadas = bs.filter((b) => { const q = b.getBoundingClientRect(); return b.scrollWidth > b.clientWidth + 1 || q.left < -1 || q.right > innerWidth + 1; }).map((b) => (b.textContent ?? "").trim());
              return { etapas: bs.map((b) => (b.textContent ?? "").trim()), cortadas, texto: d.innerText };
            }) : null;
            if (!ficha) fallas.push(`${idioma} ${vista} · tocar «גלית» en Clientes abre su ficha`);
            else {
              if (JSON.stringify(ficha.etapas) !== JSON.stringify(ETAPAS[idioma])) fallas.push(`${idioma} ${vista} · la ficha ofrece las etapas «${ETAPAS[idioma].join(" · ")}» (hoy «${ficha.etapas.join(" · ")}»)`);
              if (vista === "telefono" && ficha.cortadas.length) fallas.push(`${idioma} 390 · ninguna etapa de la ficha se corta (${ficha.cortadas.join(", ")})`);
              const mf = ficha.texto.match(JERGA);
              if (mf) fallas.push(`${idioma} ${vista} · la ficha dice «${mf[0]}»`);
            }
          } finally { await a.cerrar(); }
        });
      }
    }
  });
  assert.deepEqual(fallas, [], `I5 · Clientes sin jerga:\n${fallas.join("\n")}`);
});

test("un aviso que no salió muestra en el Registro el motivo en el idioma del panel —para el rebote «550 5.1.1 The email account does not exist.», «הכתובת לא קיימת או שכתובה לא נכון.» y sus pares en en, ru y ar— y el texto del proveedor sólo dentro de un `<details>` cerrado, «פרטים טכניים»", async () => {
  const fallas: string[] = [];
  // Los pares de P4 (prototipo aprobado, `crm03/textos-pantallas.ts` del clon de diseño).
  const MOTIVO: Record<Idioma, string> = { he: "הכתובת לא קיימת או שכתובה לא נכון.", en: "That address doesn't exist or is misspelled.", ru: "Такого адреса нет или он написан с ошибкой.", ar: "هذا العنوان غير موجود أو مكتوب بشكل خاطئ." };
  const DETALLES: Record<Idioma, string> = { he: "פרטים טכניים", en: "Technical details", ru: "Технические подробности", ar: "تفاصيل تقنية" };
  const CRUDO = "550 5.1.1 The email account does not exist.";
  await conCrm(async (crm) => {
    for (const idioma of ["he", "en", "ru", "ar"] as Idioma[]) for (const vista of ["telefono", "escritorio"] as Vista[]) {
      await paso(fallas, `${idioma} ${vista}`, async () => {
        const a = await crm.abrir({ vista, idioma, extra: true });
        try {
          await a.irA("logs");
          const r = await a.page.evaluate(([crudo, det]: [string, string]) => {
            const main = (document.querySelector("main") ?? document.body) as HTMLElement;
            const visible = main.innerText;
            const plegados = [...main.querySelectorAll("details")].filter((d) => (d.textContent ?? "").includes(crudo));
            return {
              visible,
              crudoVisible: visible.includes(crudo),
              enDetails: plegados.length > 0,
              cerrado: plegados.every((d) => !(d as HTMLDetailsElement).open),
              resumen: plegados.map((d) => (d.querySelector("summary")?.textContent ?? "").trim()),
              ok: plegados.some((d) => (d.querySelector("summary")?.textContent ?? "").trim() === det),
            };
          }, [CRUDO, DETALLES[idioma]]);
          if (!r.visible.includes(MOTIVO[idioma])) fallas.push(`${idioma} ${vista} · el Registro dice «${MOTIVO[idioma]}» para el rebote`);
          if (r.crudoVisible) fallas.push(`${idioma} ${vista} · el texto del proveedor no se ve sin abrir los detalles`);
          if (!r.enDetails || !r.cerrado || !r.ok) fallas.push(`${idioma} ${vista} · el texto del proveedor va dentro de un <details> cerrado «${DETALLES[idioma]}» (details: ${r.enDetails}, cerrado: ${r.cerrado}, resumen: ${JSON.stringify(r.resumen)})`);
        } finally { await a.cerrar(); }
      });
    }
  });
  assert.deepEqual(fallas, [], `I6 · el motivo de un aviso que no salió:\n${fallas.join("\n")}`);
});

test("el subtítulo de Tareas no promete IA en ningún idioma («עוזר», «assistant», «ассистент», «مساعد») y la fila de la dueña en Usuarios no lleva dos «:» seguidos", async () => {
  const fallas: string[] = [];
  const IA = /עוזר|assistant|ассистент|مساعد|\bAI\b|\bIA\b|בינה מלאכותית|ИИ|الذكاء الاصطناعي/i;
  await conCrm(async (crm) => {
    for (const idioma of ["he", "en", "ru", "ar"] as Idioma[]) {
      await paso(fallas, idioma, async () => {
        const a = await crm.abrir({ vista: "escritorio", idioma });
        try {
          await a.irA("tasks");
          const t = await a.page.evaluate(() => ((document.querySelector("main") ?? document.body) as HTMLElement).innerText);
          const m = t.match(IA);
          if (m) fallas.push(`${idioma} · Tareas promete IA: «${m[0]}»`);
          await a.irA("users");
          const fila = await a.page.evaluate((email: string) => {
            const hoja = [...document.querySelectorAll("#admin-content *")].find((e) => !e.closest("#admin-content > aside") && e.children.length === 0 && (e.textContent ?? "").includes(email) && e.getBoundingClientRect().width > 0);
            for (let p = hoja?.parentElement; p && p.id !== "admin-content"; p = p.parentElement) if (/[:：]/.test((p as HTMLElement).innerText) && ((p as HTMLElement).innerText.split("\n").length >= 2)) return (p as HTMLElement).innerText;
            return hoja ? (hoja.parentElement as HTMLElement).innerText : null;
          }, "duena@example.com");
          if (!fila) fallas.push(`${idioma} · Usuarios muestra la fila de la dueña`);
          else if (/:\s*[^\s:\n]+\s*:/.test(fila.replace(/\d{1,2}:\d{2}/g, ""))) fallas.push(`${idioma} · la fila de la dueña lleva dos «:» seguidos: «${fila.replace(/\s+/g, " ").slice(0, 120)}»`);
        } finally { await a.cerrar(); }
      });
    }
  });
  assert.deepEqual(fallas, [], `I7 · Tareas sin IA y Usuarios sin «::»:\n${fallas.join("\n")}`);
});

test("en ru el encabezado del menú dice «Управление» en una sola línea", async () => {
  const fallas: string[] = [];
  await conCrm(async (crm) => {
    for (const vista of ["telefono", "escritorio"] as Vista[]) {
      await paso(fallas, vista, async () => {
        const a = await crm.abrir({ vista, idioma: "ru" });
        try {
          if (vista === "telefono" && !(await abrirMenu(a.page))) fallas.push("390 · hay botón para abrir el menú");
          const r = await a.page.evaluate(() => {
            const aside = document.querySelector("aside");
            if (!aside) return null;
            const cab = [...aside.querySelectorAll("p, span, h1, h2, h3, div")].filter((e) => e.children.length === 0 && !e.closest("nav") && e.getBoundingClientRect().width > 0);
            const u = cab.find((e) => (e.textContent ?? "").trim() === "Управление");
            const lh = u ? parseFloat(getComputedStyle(u).lineHeight) || parseFloat(getComputedStyle(u).fontSize) * 1.5 : 0;
            return { textos: cab.slice(0, 4).map((e) => (e.textContent ?? "").trim()), lineas: u ? Math.round(u.getBoundingClientRect().height / lh) : 0 };
          });
          if (!r) fallas.push(`${vista} · el menú (aside)`);
          else if (r.lineas === 0) fallas.push(`${vista} · el encabezado del menú dice «Управление» (hoy: ${JSON.stringify(r.textos)})`);
          else if (r.lineas > 1) fallas.push(`${vista} · «Управление» ocupa ${r.lineas} líneas`);
        } finally { await a.cerrar(); }
      });
    }
  });
  assert.deepEqual(fallas, [], `I8 · «Управление» en una línea:\n${fallas.join("\n")}`);
});

