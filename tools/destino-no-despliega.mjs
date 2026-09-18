// pre-push: comprueba por ESTADO (ley 3) que el destino no despliega por push.
//   T (Vercel): vercel.json del commit a pushear declara git.deploymentEnabled.main === false.
//   H (Railway): el flag vive sólo en el dashboard; la evidencia por estado es que origin/main
//     ya va por delante del commit desplegado (railway status --json). Si coinciden, no es
//     verificable desde acá: se declara y se frena; HIGIENE_DESTINO_VERIFICADO=1 tras mirar el
//     dashboard ("Auto deploy is disabled") deja pasar ese push.
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { ROOT, git } from "./_git.mjs";

function falla(msg) { console.error(`[pre-push] ROJO: ${msg}`); process.exit(1); }

if (existsSync(`${ROOT}/vercel.json`)) {
  const v = JSON.parse(git(["show", "HEAD:vercel.json"]));
  if (v?.git?.deploymentEnabled?.main !== false) falla("vercel.json en HEAD no tiene git.deploymentEnabled.main=false: un push desplegaría la flota.");
  console.log("[pre-push] Vercel: git.deploymentEnabled.main=false en HEAD · el push no despliega.");
} else if (existsSync(`${ROOT}/railway.toml`)) {
  if (process.env.HIGIENE_DESTINO_VERIFICADO === "1") { console.log("[pre-push] Railway: verificado por Liam en el dashboard (HIGIENE_DESTINO_VERIFICADO=1)."); process.exit(0); }
  let desplegado = "";
  try {
    const st = JSON.parse(execFileSync("railway", ["status", "--json"], { cwd: ROOT, encoding: "utf8", timeout: 40000, shell: true }));
    const nodos = st.environments?.edges?.flatMap((e) => e.node.serviceInstances?.edges ?? []) ?? [];
    desplegado = nodos.flatMap((n) => n.node.activeDeployments ?? []).map((d) => d.meta?.commitHash).find(Boolean) ?? "";
  } catch (e) { falla(`railway status falló (${String(e.message).split("\n")[0]}): no verificable. Mirar el dashboard y repetir con HIGIENE_DESTINO_VERIFICADO=1.`); }
  if (!desplegado) falla("railway status no trae commit desplegado: no verificable.");
  const remoto = git(["rev-parse", "origin/main"]);
  if (remoto === desplegado) falla(`producción (${desplegado.slice(0, 7)}) coincide con origin/main: no se puede probar por estado que el autodeploy esté apagado. Mirar el dashboard de Railway y repetir con HIGIENE_DESTINO_VERIFICADO=1.`);
  let ancestro = false;
  try { git(["merge-base", "--is-ancestor", desplegado, remoto]); ancestro = true; } catch {}
  if (!ancestro) falla(`producción (${desplegado.slice(0, 7)}) no es ancestro de origin/main: estado raro, no verificable.`);
  console.log(`[pre-push] Railway: producción en ${desplegado.slice(0, 7)}, origin/main ya va por delante sin deploy · el push no despliega.`);
} else {
  falla("ni vercel.json ni railway.toml: no sé qué destino es.");
}
