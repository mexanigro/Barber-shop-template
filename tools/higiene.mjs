// Chequeo horario local. Recorre los repos que recibe por argumento (por defecto, éste) y manda un
// email a Liam por Resend si hay archivos sucios o commits sin push desde hace más de --umbral
// minutos (60). Clave: RESEND_API_KEY del entorno o del .env.local del hub.
//
// Instalar (tarea programada de Windows, usuario actual, cada hora):
//   schtasks /Create /F /TN Nichos-higiene /SC HOURLY /TR "node C:\Users\liama\Desktop\Nichos-hub\tools\higiene.mjs C:\Users\liama\Desktop\Nichos-hub C:\Users\liama\Desktop\Nichos\Barber-shop-template-main"
// Probar:      schtasks /Run /TN Nichos-higiene        Estado: schtasks /Query /TN Nichos-higiene /V /FO LIST
// Desinstalar: schtasks /Delete /F /TN Nichos-higiene
// A mano:      node tools/higiene.mjs [repos...] [--umbral 0] [--sin-email]
import { readFileSync, statSync } from "node:fs";
import { execFileSync } from "node:child_process";

const HUB_ENV = "C:/Users/liama/Desktop/Nichos-hub/.env.local";
const args = process.argv.slice(2);
const umbral = Number(args.includes("--umbral") ? args[args.indexOf("--umbral") + 1] : 60);
const sinEmail = args.includes("--sin-email");
const repos = args.filter((a, i) => !a.startsWith("--") && args[i - 1] !== "--umbral");
if (!repos.length) repos.push(new URL("..", import.meta.url).pathname.replace(/^\/([A-Z]:)/, "$1"));

const git = (cwd, ...a) => execFileSync("git", a, { cwd, encoding: "utf8", timeout: 20000 }).trimEnd();
const ahora = Date.now();
const faltas = [];
for (const repo of repos) {
  try {
    const sucios = git(repo, "status", "--porcelain").split("\n").filter(Boolean);
    const viejos = sucios.filter((l) => {
      try { return ahora - statSync(`${repo}/${l.slice(3).trim().replace(/^"|"$/g, "")}`).mtimeMs > umbral * 60000; } catch { return true; } // borrado: cuenta
    });
    if (viejos.length) faltas.push(`${repo}: ${viejos.length} archivo(s) sucio(s) desde hace más de ${umbral} min\n  ${viejos.join("\n  ")}`);
    let sinPush = [];
    try { sinPush = git(repo, "log", "--format=%h %ct %s", "@{u}..HEAD").split("\n").filter(Boolean); } catch { sinPush = ["? 0 (sin upstream)"]; }
    const tarde = sinPush.filter((l) => ahora - Number(l.split(" ")[1]) * 1000 > umbral * 60000);
    if (tarde.length) faltas.push(`${repo}: ${tarde.length} commit(s) sin push desde hace más de ${umbral} min\n  ${tarde.join("\n  ")}`);
  } catch (e) { faltas.push(`${repo}: no se pudo leer (${e.message})`); }
}
if (!faltas.length) { console.log(`higiene ok · ${repos.length} repo(s) limpios (umbral ${umbral} min)`); process.exit(0); }
const texto = `HIGIENE · ${new Date().toISOString()}\n\n${faltas.join("\n\n")}\n\nResolver: commit + push, o revert.`;
console.log(texto);
if (sinEmail) process.exit(1);
let key = process.env.RESEND_API_KEY;
if (!key) try { key = readFileSync(HUB_ENV, "utf8").match(/^RESEND_API_KEY=(.+)$/m)?.[1].trim(); } catch {}
if (!key) { console.error("sin RESEND_API_KEY: no se pudo avisar"); process.exit(1); }
const r = await fetch("https://api.resend.com/emails", {
  method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
  body: JSON.stringify({ from: process.env.EMAIL_FROM || "Liam de Arzac Studio <hola@arzac.studio>", to: [process.env.HIGIENE_EMAIL_TO || "website@arzac.studio"], subject: `HIGIENE: ${faltas.length} aviso(s) en T/H`, text: texto }),
});
console.log(`email → ${r.status} ${(await r.text()).slice(0, 200)}`);
process.exit(r.ok ? 1 : 3);
