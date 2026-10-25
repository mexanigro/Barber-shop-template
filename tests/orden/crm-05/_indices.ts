// CRM-05 (sesión A, 2026-10-25) · los índices de D-369 y su lectura en los dos JSON del árbol: X1 y la precondición del árbol de W2.
/* eslint-disable @typescript-eslint/no-explicit-any */
import { existe, fuente } from "./_comun.ts";

/** Los índices de D-369: colección y campos en orden, con su orden. */
export const INDICES: { coleccion: string; campos: [string, "ASCENDING" | "DESCENDING"][] }[] = [
  { coleccion: "stock_items", campos: [["clientId", "ASCENDING"], ["name", "ASCENDING"]] },
  { coleccion: "stock_movements", campos: [["clientId", "ASCENDING"], ["itemId", "ASCENDING"], ["createdAt", "DESCENDING"]] },
  { coleccion: "appointments", campos: [["clientId", "ASCENDING"], ["date", "ASCENDING"]] },
];
export const firma = (campos: [string, string][]) => campos.map(([f, o]) => `${f} ${o}`).join(", ");

/** Las fallas de X1 en el árbol de `ROOT` (también la precondición de W2). */
export function fallasDeX1(): string[] {
  const fallas: string[] = [];
  for (const archivo of ["firestore.indexes.json", "firestore.nichos-us-prod.indexes.json"]) {
    if (!existe(archivo)) { fallas.push(`${archivo} existe`); continue; }
    let indices: any[] = [];
    try { indices = JSON.parse(fuente(archivo)).indexes ?? []; } catch (e) { fallas.push(`${archivo} es JSON: ${(e as Error).message}`); continue; }
    for (const { coleccion, campos } of INDICES) {
      const hay = indices.some((i) => i.collectionGroup === coleccion && (i.queryScope ?? "COLLECTION") === "COLLECTION" && firma((i.fields ?? []).map((f: any) => [f.fieldPath, f.order])) === firma(campos));
      if (!hay) fallas.push(`${archivo} declara ${coleccion} (${firma(campos)})`);
    }
  }
  return fallas;
}
