// captura-tarjetas.mjs — SERVICES-02 fase 2c: evidencia del carrusel de tarjetas-botón sobre :3000 (servidor ya arrancado con el fixture): entrada (pista), reposo, tap en lateral (centra sin abrir el wizard), medio, tocada; en 1280 hover, flechas fuera del bloque y avance; /servicios. Con idioma: alfabeto de la sección.
// Uso: node tools/material/captura-tarjetas.mjs <tag> <carpeta> [375|1280] [en|ru|ar]
import { chromium } from "playwright";
const [tag, out, vk = "375", lang = ""] = process.argv.slice(2); const W = +vk; const H = W < 768 ? 812 : 800;
const b = await chromium.launch();
const ctx = W < 768 ? await b.newContext({ viewport: { width: W, height: H }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }) : await b.newContext({ viewport: { width: W, height: H } });
if (lang) await ctx.addInitScript((l) => localStorage.setItem("preferred_language", l), lang);
const p = await ctx.newPage(); await p.goto("http://localhost:3000/", { waitUntil: "networkidle" }); await p.waitForTimeout(3500); // el splash de A sale a ~1,5 s y hace scrollTo(0,0): se espera a que termine
const hb = await p.evaluate(() => Math.round(document.querySelector("#hero").getBoundingClientRect().bottom + scrollY));
const shot = (n) => p.screenshot({ path: `${out}/${tag}-${vk}${lang ? "-" + lang : ""}-v6c-${n}.png`, clip: { x: 0, y: 0, width: W, height: H } });
const medir = () => p.evaluate(() => { const ul = document.querySelector(".svc-carousel"); const lis = [...ul.children].map((li) => { const c = li.querySelector(".svc-card"); const r = c.getBoundingClientRect(); const cs = getComputedStyle(c); const name = li.querySelector(".svc-name"); return { d: li.style.getPropertyValue("--d"), dx: li.style.getPropertyValue("--dx"), cen: li.dataset.centrada, w: Math.round(r.width), h: Math.round(r.height), left: Math.round(r.left), op: cs.opacity, tf: cs.transform, img: getComputedStyle(li.querySelector(".svc-img")).transform, nameOp: name ? getComputedStyle(name).opacity : null, nameLines: name ? Math.round(name.getBoundingClientRect().height / parseFloat(getComputedStyle(name).lineHeight)) : null }; }); const s = document.querySelector("#services").getBoundingClientRect(); return { n: lis.length, seccion: Math.round(s.height), hint: ul.classList.contains("svc-hint"), pt: getComputedStyle(ul).paddingTop, visibles: lis.filter((x) => x.left + x.w > 0 && x.left < innerWidth) }; });
// entrada: la sección entra en pantalla → pista (svc-hint) durante 900 ms
await p.evaluate((y) => window.scrollTo(0, y), hb - H * 0.55); await p.waitForTimeout(350);
const e = await medir(); console.log(tag, vk, "entrada hint", e.hint, "pt", e.pt); await shot("entrada");
await p.evaluate((y) => window.scrollTo(0, y), hb - 24); await p.waitForTimeout(1200);
if (lang) { const al = await p.evaluate(`(() => { const s = document.querySelector("#services"); const txt = [s.innerText, ...[...s.querySelectorAll("[aria-label]")].map((e) => e.getAttribute("aria-label"))].join(" "); const heb = /[֐-׿]/.test(txt), lat = /[A-Za-z]{3,}/.test(txt.replace(/₪|WhatsApp/g, "")), cyr = /[Ѐ-ӿ]/.test(txt), ara = /[؀-ۿ]/.test(txt); return { lang: document.documentElement.lang, dir: document.documentElement.dir, heb, lat, cyr, ara, prev: document.querySelector(".svc-arrow-prev")?.getAttribute("aria-label"), ver: s.querySelector("button:last-of-type")?.innerText }; })()`); console.log(tag, vk, lang, "alfabeto", JSON.stringify(al)); }
const g = await medir(); console.log(tag, vk, "tarjetas", g.n, "sección", g.seccion, "visibles", JSON.stringify(g.visibles)); await shot("reposo");
if (W < 768) {
  // tap en la lateral (la 2.ª): debe centrarse sin abrir el wizard
  const lat = p.locator(".svc-slide").nth(1).locator(".svc-card"); await lat.tap(); await p.waitForTimeout(900);
  const t = await medir(); const wiz = await p.locator("[role=dialog]").count();
  console.log(tag, vk, "tap-lateral → centrada", t.visibles.map((x) => x.cen).join(""), "wizard", wiz, JSON.stringify(t.visibles.map((x) => ({ d: x.d, dx: x.dx, img: x.img, nameOp: x.nameOp, nameLines: x.nameLines })))); await shot("tap-lateral");
  await p.evaluate(() => { const ul = document.querySelector(".svc-carousel"); const w = ul.children[0].getBoundingClientRect().width; ul.scrollBy({ left: (document.documentElement.dir === "rtl" ? -1 : 1) * w * 0.5, behavior: "instant" }); }); await p.waitForTimeout(500);
  const m = await medir(); console.log(tag, vk, "medio", JSON.stringify(m.visibles.map((x) => ({ d: x.d, dx: x.dx, img: x.img, nameOp: x.nameOp })))); await shot("medio");
  await p.evaluate(() => { const ul = document.querySelector(".svc-carousel"); const w = ul.children[0].getBoundingClientRect().width; ul.scrollBy({ left: (document.documentElement.dir === "rtl" ? -1 : 1) * w * 0.5, behavior: "instant" }); }); await p.waitForTimeout(500);
  const central = p.locator(".svc-slide").nth(2).locator(".svc-card"); await central.hover(); await p.mouse.down(); await p.waitForTimeout(250);
  await shot("tocada"); await p.mouse.up(); await p.keyboard.press("Escape"); await p.waitForTimeout(400);
} else {
  const c1 = p.locator(".svc-slide").nth(1).locator(".svc-card"); await c1.hover(); await p.waitForTimeout(300);
  const hv = await p.evaluate(() => { const c = document.querySelectorAll(".svc-card")[1]; const cs = getComputedStyle(c); return { tf: cs.transform, sh: cs.boxShadow.slice(0, 60) }; }); console.log(tag, vk, "hover", JSON.stringify(hv)); await shot("hover");
  await p.mouse.move(5, 5);
  const arrows = await p.evaluate(() => [...document.querySelectorAll(".svc-arrow")].map((a) => { const r = a.getBoundingClientRect(); const s = document.querySelector(".svc-carousel").getBoundingClientRect(); return { x: Math.round(r.left), w: Math.round(r.width), vis: getComputedStyle(a).display, fueraDelBloque: r.right <= s.left + 1 || r.left >= s.right - 1 }; })); console.log(tag, vk, "flechas", JSON.stringify(arrows));
  await p.locator(".svc-arrow-next").click(); await p.waitForTimeout(700); const a2 = await medir(); console.log(tag, vk, "tras flecha", JSON.stringify(a2.visibles.map((x) => ({ left: x.left, w: x.w, tf: x.tf })))); await shot("flecha");
}
await p.locator("#services button").last().click(); await p.waitForTimeout(1200);
await shot("servicios"); console.log(tag, vk, "url", p.url());
await b.close();
