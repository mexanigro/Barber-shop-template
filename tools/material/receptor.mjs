#!/usr/bin/env node
/**
 * receptor.mjs — trae archivos desde una pestaña del navegador (ChatGPT, Sora, Gemini…) sin pasar base64 por el chat.
 *
 * Uso: node tools/material/receptor.mjs <carpeta-salida> [--puerto 8787] [--esperados N]
 *   Escribe cada archivo en <carpeta-salida>/<nombre> y sale solo al recibir N (sin --esperados queda abierto; Ctrl+C).
 *
 * Desde la pestaña (Chrome MCP, `javascript_tool`, SIN top-level await: envolver en `(async()=>{…})()` y leer el
 * resultado en una llamada aparte), por cada archivo:
 *   1. `const b = await (await fetch(url)).blob();`                       // url = src del <img>/<video> de la conversación
 *   2. `const d = await new Promise(r => { const f = new FileReader(); f.onload = () => r(f.result); f.readAsDataURL(b); });`
 *   3. `window.name = "<nombre.ext>|" + d;`                                // el nombre va delante, separado por «|»
 *   4. navegar la misma pestaña a http://localhost:<puerto>/ → la página lee `window.name`, hace POST a /save y responde «guardado: …»
 *   5. volver a la conversación y repetir.
 * Por qué así: el CSP de chatgpt.com bloquea `fetch` a localhost desde la página; `window.name` sobrevive a la navegación
 * y el POST sale desde el propio origen del receptor (MATERIAL-01, 2026-09-19). Nunca se transcribe base64 por la salida del modelo.
 */
import http from "node:http"; import fs from "node:fs"; import path from "node:path";
const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf(`--${n}`); return i >= 0 ? args[i + 1] : d; };
const outDir = args.find((a) => !a.startsWith("--"));
if (!outDir) { console.error("uso: node tools/material/receptor.mjs <carpeta-salida> [--puerto 8787] [--esperados N]"); process.exit(2); }
const port = +opt("puerto", 8787); const expected = +opt("esperados", 0);
fs.mkdirSync(outDir, { recursive: true }); let got = 0;
const html = `<!doctype html><meta charset="utf-8"><body><pre id=s>leyendo window.name…</pre><script>
(async()=>{const d=window.name||"";const i=d.indexOf("|");const el=document.getElementById("s");if(i<0||!d.slice(i+1).startsWith("data:")){el.textContent="sin dataURL (len "+d.length+")";return}
const name=d.slice(0,i);const b=await (await fetch(d.slice(i+1))).blob();const r=await fetch("/save?name="+encodeURIComponent(name),{method:"POST",body:b});el.textContent="guardado: "+await r.text();window.name="";})();
</script>`;
http.createServer((req, res) => {
  if (req.method === "POST" && req.url.startsWith("/save")) {
    const name = path.basename(new URL(req.url, "http://x").searchParams.get("name") || "sin-nombre"); const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => { const b = Buffer.concat(chunks); const p = path.join(outDir, name); fs.writeFileSync(p, b); got++; console.log("guardado", p, b.length); res.end(`${name} ${b.length} bytes`); if (expected && got >= expected) setTimeout(() => process.exit(0), 500); });
    return;
  }
  res.setHeader("content-type", "text/html; charset=utf-8"); res.end(html);
}).listen(port, () => console.log(`receptor en http://localhost:${port}/ → ${path.resolve(outDir)}${expected ? ` · espera ${expected}` : ""}`));
