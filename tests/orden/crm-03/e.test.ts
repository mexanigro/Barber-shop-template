// CRM-03 · E1 (T+H) · el registro: el párrafo CRM-03 en § Puertas de CLAUDE.md y el bloque CONTRATO-DECLARADO sin cambios.
// Sesión A (2026-10-15): test rojo. Igual byte a byte en T y en H; cada repo afirma su propio CLAUDE.md (inciso n).
import { test } from "node:test";
import assert from "node:assert/strict";
import { MARCA_01, REPO, ROOT, bloqueDe, fuente, git, parrafoDe } from "./_comun.ts";

const PALABRAS = ["/api/cron/avisos", "18:00", "Asia/Jerusalem", "CRON_SECRET", "emails-turno", "lang", "guardarConfig", "schedule", "dateOverrides", "/api/admin/me", "סמן כשולם", "domingo", "44", "_crm.ts", "MARCA-01"];

test("CLAUDE.md § Puertas de T y de H tiene un párrafo CRM-03 que nombra «/api/cron/avisos», «18:00», «Asia/Jerusalem», «CRON_SECRET», «emails-turno», «lang», «guardarConfig», «schedule», «dateOverrides», «/api/admin/me», «סמן כשולם», «domingo», «44», «_crm.ts» y «MARCA-01»; y el bloque CONTRATO-DECLARADO es idéntico al del commit aprobado de MARCA-01 (T 96bceb2 / H 17fd18b)", () => {
  const claude = fuente("CLAUDE.md");
  const p = parrafoDe(claude, "CRM-03");
  assert.ok(p, `§ Puertas automáticas de ${REPO} debe tener un párrafo «**CRM-03 (AAAA-MM-DD):**»`);
  const faltan = PALABRAS.filter((w) => !p.includes(w));
  assert.deepEqual(faltan, [], `el párrafo CRM-03 de ${REPO} debe nombrar ${faltan.map((w) => `«${w}»`).join(", ")}`);
  const aprobado = git(ROOT, "show", `${MARCA_01.aprobado[REPO]}:CLAUDE.md`);
  assert.equal(bloqueDe(claude), bloqueDe(aprobado), `el bloque CONTRATO-DECLARADO de ${REPO} no cambia respecto de ${MARCA_01.aprobado[REPO]}`);
});
