// CRM-05 · W1, W2 (T, webs) · lo público y los índices en el Firestore de PRODUCCIÓN (D-366, D-369; S8, X1). Sesión A (2026-10-25):
// tests rojos.
//
// Medido el 2026-10-25 (sólo lectura): un `runQuery` SIN credenciales sobre `config` en `default` responde 200 con documentos (la lista
// de configs es pública), y `config/demo-demo-plantilla-a-f87b89e8` se lee sin credenciales (200); la lista de índices (API de
// administración, con la cuenta de servicio del `.env.local` de H) da en `default` y en `nichos-us-prod` sólo los de `appointments`
// (clientId, createdAt desc) y (clientId, date, status), ninguno de stock. Cada una lleva su precondición del árbol (inciso l): W1, que
// las reglas del árbol no dejan listar `config` sin sesión (S8); W2, que los dos JSON declaran los índices (X1). En el rojo caen ahí,
// sin salir a la red. Salen a la red sólo para LEER (marca «, webs», inciso s): se miden con `rojo-verde --orden crm-05` después de que
// Liam despliegue reglas e índices.
/* eslint-disable @typescript-eslint/no-explicit-any */
import { test } from "node:test";
import assert from "node:assert/strict";
import { leerReglas, permitido } from "./_reglas.ts";
import { DEMO, FIRESTORE, firestoreRest, fuente, tokenDeGoogle } from "./_comun.ts";
import { INDICES, fallasDeX1, firma } from "./_indices.ts";

test("en el Firestore de producción una consulta anónima que lista `config` responde PERMISSION_DENIED y la lectura anónima de `config/<demo>` responde el documento", async () => {
  const fallas: string[] = [];
  // Del árbol: las reglas no dejan listar config sin sesión (S8).
  let cerrado = false;
  try { cerrado = !permitido(leerReglas(fuente("firestore.rules")), "list", "config/c1", { auth: null, docs: { "clients/c1": { status: "active" } }, guardado: { services: [] } }); } catch { cerrado = false; }
  if (!cerrado) fallas.push("precondición del árbol (S8): firestore.rules no deja listar config sin sesión");
  // De producción, sin credenciales (sólo con el árbol de CRM-05: en el rojo no sale a la red).
  if (cerrado) try {
    const r = await firestoreRest("default", "documents:runQuery", { metodo: "POST", cuerpo: { structuredQuery: { from: [{ collectionId: "config" }], limit: 1 } } });
    const estado = Array.isArray(r.json) ? r.json[0]?.error?.status : r.json?.error?.status;
    if (r.status !== 403 || estado !== "PERMISSION_DENIED") fallas.push(`listar config sin credenciales responde 403 PERMISSION_DENIED (hoy ${r.status} ${estado ?? JSON.stringify(r.json).slice(0, 160)})`);
  } catch (e) { fallas.push(`listar config sin credenciales: ${(e as Error).message}`); }
  if (cerrado) try {
    const r = await firestoreRest("default", `documents/config/${DEMO.clientId}?mask.fieldPaths=adminEmail`);
    if (r.status !== 200 || !String(r.json?.name ?? "").endsWith(`/documents/config/${DEMO.clientId}`)) fallas.push(`leer config/${DEMO.clientId} sin credenciales responde el documento (hoy ${r.status} ${JSON.stringify(r.json?.error ?? r.json).slice(0, 160)})`);
  } catch (e) { fallas.push(`leer config/${DEMO.clientId} sin credenciales: ${(e as Error).message}`); }
  assert.deepEqual(fallas, [], `W1 · lo público en producción:\n${fallas.join("\n")}`);
});

test("las bases `default` y `nichos-us-prod` tienen en estado READY los índices de X1", async () => {
  const fallas: string[] = [];
  // Del árbol: los dos JSON declaran los índices (X1).
  const x1 = fallasDeX1();
  for (const f of x1) fallas.push(`precondición del árbol (X1): ${f}`);
  // De producción: la lista de índices de cada base (sólo lectura; en el rojo no sale a la red).
  let token = "";
  if (!x1.length) try { token = await tokenDeGoogle(); } catch (e) { fallas.push(`el token de la cuenta de servicio de H: ${(e as Error).message.split("\n")[0]}`); }
  if (token) for (const base of FIRESTORE.bases) {
    try {
      const r = await firestoreRest(base, "collectionGroups/-/indexes", { token });
      if (r.status !== 200) { fallas.push(`${base} · la lista de índices responde 200 (hoy ${r.status} ${JSON.stringify(r.json?.error ?? r.json).slice(0, 160)})`); continue; }
      const indices: any[] = r.json.indexes ?? [];
      for (const { coleccion, campos } of INDICES) {
        const delGrupo = indices.filter((i) => String(i.name ?? "").includes(`/collectionGroups/${coleccion}/`) && i.queryScope === "COLLECTION");
        const igual = delGrupo.find((i) => firma((i.fields ?? []).filter((f: any) => f.fieldPath !== "__name__").map((f: any) => [f.fieldPath, f.order])) === firma(campos));
        if (!igual) fallas.push(`${base} · falta el índice ${coleccion} (${firma(campos)}) (hay de ${coleccion}: ${delGrupo.map((i) => `(${firma(i.fields.filter((f: any) => f.fieldPath !== "__name__").map((f: any) => [f.fieldPath, f.order]))}) ${i.state}`).join("; ") || "ninguno"})`);
        else if (igual.state !== "READY") fallas.push(`${base} · el índice ${coleccion} (${firma(campos)}) está READY (hoy ${igual.state})`);
      }
    } catch (e) { fallas.push(`${base} · la lista de índices: ${(e as Error).message}`); }
  }
  assert.deepEqual(fallas, [], `W2 · los índices en producción:\n${fallas.join("\n")}`);
});
