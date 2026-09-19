// GAMA-02 (2026-09-18): la medida T de tools/gama.mjs juzga los píxeles con color, no el promedio.
// Tres sintéticos (PNG generados aquí, sin dependencias): fondo --surface + rectángulo del 6 % en el acento (T sí),
// en lila fuera de paleta (T NO) y del 30 % en tono de piel/pelo 60° (T sí: la banda 40–80° no cuenta).
import { test } from "node:test";
import assert from "node:assert/strict";
import { deflateSync } from "node:zlib";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { medir, paletaDe, OUT_MAX } from "../tools/gama.mjs";

const crcTable = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc32 = (buf: Buffer) => { let c = 0xffffffff; for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const chunk = (type: string, data: Buffer) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type, "ascii"), data]); const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td)); return Buffer.concat([len, td, crc]); };
const hex = (h: string): [number, number, number] => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];

/** PNG RGB 640×480: fondo `bg` y un rectángulo `fg` que ocupa `share` del cuadro (centrado). */
function png(bg: string, fg: string, share: number): Buffer {
  const W = 640, H = 480; const side = Math.round(Math.sqrt(W * H * share)); const x0 = (W - side) >> 1, y0 = (H - side) >> 1;
  const B = hex(bg), F = hex(fg); const raw = Buffer.alloc((W * 3 + 1) * H);
  for (let y = 0; y < H; y++) { raw[y * (W * 3 + 1)] = 0; for (let x = 0; x < W; x++) { const c = x >= x0 && x < x0 + side && y >= y0 && y < y0 + side ? F : B; const o = y * (W * 3 + 1) + 1 + x * 3; raw[o] = c[0]; raw[o + 1] = c[1]; raw[o + 2] = c[2]; } }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4); ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
}

test("GAMA-02: T mira los píxeles con color — acento 6 % pasa, lila 6 % tumba, piel 30 % no cuenta", async () => {
  const dir = mkdtempSync(join(tmpdir(), "gama-"));
  const files = [
    { role: "acento 6 %", src: join(dir, "acento.png"), kind: "image" as const, esperado: true, png: png("#f6f7f2", "#5d7a57", 0.06) },
    { role: "lila 6 %", src: join(dir, "lila.png"), kind: "image" as const, esperado: false, png: png("#f6f7f2", "#b48ad0", 0.06) },
    { role: "piel 30 %", src: join(dir, "piel.png"), kind: "image" as const, esperado: true, png: png("#f6f7f2", "#c9a27a", 0.3) },
  ];
  for (const f of files) writeFileSync(f.src, f.png);
  const { rows } = await medir(files.map(({ role, src, kind }) => ({ role, src, kind })), paletaDe("a"));
  for (const [i, f] of files.entries()) {
    const r = rows[i] as { T: boolean; fuera: number; sat: number; dHue: number | null; error?: string };
    assert.equal(r.error, undefined, `${f.role}: ${r.error}`);
    assert.equal(r.T, f.esperado, `${f.role}: T=${r.T} sat=${r.sat} fuera=${r.fuera} ΔH=${r.dHue}`);
  }
  const lila = rows[1] as { fuera: number };
  assert.ok(lila.fuera > OUT_MAX, `lila: fuera ${lila.fuera} debe superar ${OUT_MAX}`);
  const piel = rows[2] as { sat: number; fuera: number };
  assert.ok(piel.sat < 0.15 && piel.fuera <= OUT_MAX, `piel: sat ${piel.sat} fuera ${piel.fuera}`);
});
