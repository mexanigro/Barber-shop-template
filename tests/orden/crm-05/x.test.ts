// CRM-05 · X1 (T) · los índices de Firestore en los dos JSON del árbol (D-369, D-360; AUD 10). Sesión A (2026-10-25): test rojo.
//
// Medido en T 8b2859c: `firestore.indexes.json` y `firestore.nichos-us-prod.indexes.json` traen 12 índices cada uno; ninguno de
// `stock_items` ni de `stock_movements`, y de `appointments` sólo (clientId, createdAt desc) y (clientId, date, status). Lo que está en
// producción lo mide W2.
import { test } from "node:test";
import assert from "node:assert/strict";
import { fallasDeX1 } from "./_indices.ts";

test("`firestore.indexes.json` y `firestore.nichos-us-prod.indexes.json` declaran `stock_items (clientId, name)`, `stock_movements (clientId, itemId, createdAt desc)` y `appointments (clientId, date)`", () => {
  const fallas = fallasDeX1();
  assert.deepEqual(fallas, [], `X1 · los índices en los dos JSON:\n${fallas.join("\n")}`);
});
