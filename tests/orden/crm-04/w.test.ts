// CRM-04 · W1 (T, webs) · la demo de prueba de punta a punta (D-351). Sesión A (2026-10-20): test rojo.
//
// Medido el 2026-10-20: GET https://demo-demo-plantilla-a-f87b89e8.arzac.studio/api/cron/avisos responde 500 «CRON_SECRET not
// configured.» (la demo se redesplegó sin la variable). Registro (§ Interfaz): B escribe `tests/crm-04-demo.json` con
// `{ clientId, deployment, commitT }` después del Redeploy (con el «sí» de Liam). Precondición del árbol (inciso l): el registro existe y
// su commit desciende del rojo de esta orden; en el rojo cae ahí, sin salir a la red. Sale a la red sólo para LEER (marca «, webs»).
/* eslint-disable @typescript-eslint/no-explicit-any */
import { test } from "node:test";
import assert from "node:assert/strict";
import { DEMO, ROOT, existe, fuente, git, vercel } from "./_comun.ts";

test("la demo de prueba está desplegada con el commit de B de esta orden (readyState READY) y GET /api/cron/avisos sin Authorization responde 401", async () => {
  assert.ok(existe("tests/crm-04-demo.json"), "tests/crm-04-demo.json registra la demo redesplegada ({ clientId, deployment, commitT })");
  const reg = JSON.parse(fuente("tests/crm-04-demo.json"));
  assert.equal(reg.clientId, DEMO.clientId, "el registro es de la demo de prueba");
  const rojo = git(ROOT, "log", "--format=%H", "--diff-filter=A", "-1", "HEAD", "--", "tests/orden/crm-04/HOJA.md");
  let commit = "", desciende = false;
  try { commit = git(ROOT, "rev-parse", "--verify", `${String(reg.commitT ?? "")}^{commit}`); git(ROOT, "merge-base", "--is-ancestor", rojo, commit); desciende = true; } catch { desciende = false; }
  assert.ok(desciende && commit !== rojo, `commitT (${reg.commitT}) es un commit de B: desciende del rojo de crm-04 (${rojo.slice(0, 7)}) y no es el rojo`);
  const fallas: string[] = [];
  try {
    const d = await vercel(`/v13/deployments/${encodeURIComponent(reg.deployment)}`);
    if (d.status !== 200) fallas.push(`la API de Vercel da el deployment ${reg.deployment} (hoy ${d.status} ${JSON.stringify(d.json?.error ?? "").slice(0, 120)})`);
    else {
      if (d.json.readyState !== "READY") fallas.push(`el deployment está READY (hoy ${d.json.readyState})`);
      if (!String(d.json.meta?.githubCommitSha ?? "").startsWith(commit.slice(0, 7))) fallas.push(`el deployment es del commit ${commit.slice(0, 7)} (hoy ${d.json.meta?.githubCommitSha})`);
      if (d.json.projectId !== DEMO.proyecto) fallas.push(`el deployment es del proyecto de la demo (${d.json.projectId})`);
    }
    const a = await vercel(`/v4/aliases/${new URL(DEMO.url).host}`);
    if (a.status !== 200 || (a.json.deploymentId ?? a.json.alias?.deploymentId) !== reg.deployment) fallas.push(`el dominio de la demo apunta a ese deployment (hoy ${a.status} ${a.json.deploymentId ?? JSON.stringify(a.json?.error ?? "")})`);
  } catch (e) { fallas.push(`la API de Vercel: ${(e as Error).message.split("\n")[0]}`); }
  try {
    const r = await fetch(`${DEMO.url}/api/cron/avisos`, { signal: AbortSignal.timeout(20000) });
    if (r.status !== 401) fallas.push(`GET /api/cron/avisos sin Authorization responde 401 (hoy ${r.status} ${(await r.text()).slice(0, 80)})`);
  } catch (e) { fallas.push(`GET /api/cron/avisos: ${(e as Error).message}`); }
  assert.deepEqual(fallas, [], `W1 · la demo de punta a punta:\n${fallas.join("\n")}`);
});
