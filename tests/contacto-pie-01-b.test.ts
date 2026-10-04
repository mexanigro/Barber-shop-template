// CONTACTO-PIE-01 · copia promovida (CIERRE-TRAMO-01, 2026-10-03, D-221). La orden quedó aprobada por Liam el 2026-10-03
// (T bcb746a · H 52a9af4) y su carpeta está congelada; esto es la copia editable que corre `npm test` todos los días.
// Recorte: entera.
// CONTACTO-PIE-01 · C4, E3 (T) · sin navegador. Sesión A (2026-10-03): tests rojos.
//
// C4 · la dirección y la línea de la marca por idioma, con sus cinco lugares (D-205, inciso v). Contacto y el pie leen
// `translations.<lang>.contact.address` y `translations.<lang>.brand.tagline`; el hub no tenía casilla para ninguna de las dos en otro
// idioma. Medido por A el 2026-10-03: `verdad/contratos.json` tiene 40 filas y ninguna de las dos; `hueco.mjs --id contact.address.idiomas`
// sale 2 («sin filas»); los fixtures no traen `translations.<lang>.contact.address` y A no trae `brand.tagline` en ningún otro idioma.
// La dirección esperada es la de diseno/services/prototipo/idiomas-{a,c}.json, COPIADA aquí (el rojo es del árbol: el test no lee el registro).
//
// E3 · dónde escribe `recrear`. Lo dejó la verificadora de INSTAGRAM-FAQ-01: `tools/verdad/recrear.mjs` sin `--out` escribe en
// `C:/Users/liama/Desktop/Nichos/bloque-04/verdad/capturas/<árbol de HEAD>/` —dentro del registro, que no es de ningún repo—; la
// verificadora dejó ahí una carpeta y la borró. Medido por A el 2026-10-03: con el puerto ocupado y `--solo-diff` (no levanta servidores
// ni abre navegador) imprime «recrear · test-b4-peluqueria-a · C:\Users\liama\Desktop\Nichos\bloque-04\verdad\capturas\<árbol>» y deja
// ahí `recrear-a.json`; con `--out <dir>` escribe en `<dir>`. Que sin `--out` escriba en el directorio temporal (`os.tmpdir()`, que el
// test fija con TEMP/TMP), y con `--out` donde se le diga; en las dos direcciones.
// Caja negra: `recrear.mjs` como proceso, con un puerto ocupado por el propio test (así nunca levanta nada: «puerto ocupado», exit 2,
// sin matar a nadie). Si `recrear` escribe en el registro (el rojo), el test borra la carpeta que dejó, sólo si no existía antes.
// Sólo en T (inciso n). Nada sale a la red, a Firestore, a Storage ni a Vercel. Fase `test:unit` cuando se promueva (no abre navegador).
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, realpathSync, rmSync } from "node:fs";
import { createServer } from "node:net";
import { join, relative, resolve } from "node:path";
import { NODE, ROOT, conTemporalAsync, entornoLimpio, fuente, git, subcarpeta } from "./orden/contacto-pie-01/_comun.ts";

const CAPTURAS = "C:/Users/liama/Desktop/Nichos/bloque-04/verdad/capturas";
const dentro = (dir: string, padre: string) => { const r = relative(realpathSync(padre), realpathSync(dir)); return !!r && !r.startsWith("..") && !/^[a-z]:/i.test(r); };

test("`tools/verdad/recrear.mjs` sin `--out` escribe en el directorio temporal y no en el registro (`bloque-04/verdad/capturas/`), e imprime dónde; con `--out <dir>` escribe en `<dir>`", async () => {
  await conTemporalAsync(async (base) => {
    const tmp = subcarpeta(base, "tmp");
    // un puerto ocupado por el test: recrear no levanta servidores ni abre navegador («puerto ocupado», exit 2)
    const srv = createServer(); await new Promise<void>((ok) => srv.listen(0, "127.0.0.1", () => ok()));
    const puerto = String((srv.address() as { port: number }).port);
    const destinoViejo = join(CAPTURAS, git(ROOT, "rev-parse", "HEAD^{tree}"));
    const existia = existsSync(destinoViejo);
    try {
      const correr = (extra: string[]) => spawnSync(NODE, ["tools/verdad/recrear.mjs", "--paleta", "a", "--solo-diff", "--puerto", puerto, ...extra], { cwd: ROOT, encoding: "utf8", windowsHide: true, timeout: 120000, env: entornoLimpio({ TEMP: tmp, TMP: tmp, TMPDIR: tmp }) });
      const salida = (r: ReturnType<typeof correr>) => (r.stdout ?? "").match(/^recrear · test-b4-peluqueria-a · (.+)$/m)?.[1]?.trim() ?? "";
      // (1) Sin --out. Hoy escribe en el registro: aquí está el rojo.
      const r = correr([]);
      const out = salida(r);
      assert.ok(out, `recrear imprime dónde escribió (exit ${r.status}):\n${(r.stdout ?? "").slice(-600)}${r.stderr ?? ""}`);
      assert.ok(existsSync(out) && dentro(out, tmp), `sin --out, recrear escribe en el directorio temporal (${tmp}), no en «${out}»`);
      assert.ok(existsSync(join(out, "recrear-a.json")), `sin --out, deja su informe recrear-a.json en ${out}`);
      assert.equal(r.status, 2, "con el puerto ocupado, recrear sale 2 («puerto ocupado») sin levantar nada");
      // (2) Con --out: donde se le dice.
      const fuera = join(base, "fuera");
      const r2 = correr(["--out", fuera]);
      assert.equal(resolve(salida(r2)), resolve(fuera), `con --out, recrear escribe en ${fuera} (imprime «${salida(r2)}»)`);
      assert.ok(existsSync(join(fuera, "recrear-a.json")), "con --out, el informe en esa carpeta");
      assert.ok(!existsSync(destinoViejo) || existia, `ninguna corrida dejó una carpeta en el registro (${destinoViejo})`);
    } finally {
      srv.close();
      // el rojo escribe en el registro: se borra lo que dejó esta corrida, y sólo eso
      if (!existia && existsSync(destinoViejo)) rmSync(destinoViejo, { recursive: true, force: true });
      for (const d of existsSync(tmp) ? readdirSync(tmp) : []) rmSync(join(tmp, d), { recursive: true, force: true });
    }
  });
});

/** La dirección simulada de cada plantilla (calle sin número, D85) en cada idioma: diseno/services/prototipo/idiomas-{a,c}.json (D-202). */
const DIRECCION = {
  a: { he: ["רחוב המנופים", "הרצליה פיתוח", "הרצליה"], en: ["HaMenofim St", "Herzliya Pituach", "Herzliya"], ru: ["ул. ха-Менофим", "Герцлия-Питуах", "Герцлия"], ar: ["شارع هامنوفيم", "هرتسليا بيتوح", "هرتسليا"] },
  c: { he: ["רחוב פלורנטין", "פלורנטין", "תל אביב–יפו"], en: ["Florentin St", "Florentin", "Tel Aviv-Yafo"], ru: ["ул. Флорентин", "Флорентин", "Тель-Авив-Яфо"], ar: ["شارع فلورنتين", "فلورنتين", "تل أبيب-يافا"] },
} as const;
const ESCRITURA: Record<string, RegExp> = { en: /[A-Za-z]/, ru: /[Ѐ-ӿ]/, ar: /[؀-ۿ]/ };

test("la dirección y la línea de la marca en cada idioma tienen sus cinco lugares (inciso v): `verdad/contratos.json` declara las filas `contact.address.idiomas` (ruta `translations.en.contact.address.street`, clave «address») y `brand.tagline.idiomas` (ruta `translations.en.brand.tagline`, clave «tagline»), con el validador `validateTextosPorIdioma`, la casilla de la pestaña Contenido, el material en el fixture A y un guard en npm test; los fixtures A y C traen la dirección simulada de su plantilla en la raíz y en en, ru y ar, y su línea de la marca en en, ru y ar; y `hueco.mjs --id` da verde en los cinco para las dos", () => {
  type Fila = { id: string; ruta: string; clave: string; validador?: { archivo: string; funcion: string }; ui?: { componente: string; campo: string } | null; material?: { vive: string }; guard?: { archivo: string; clave?: string } };
  const filas = (JSON.parse(fuente("verdad/contratos.json")).huecos ?? []) as Fila[];
  const ESPERADAS = [
    { id: "contact.address.idiomas", ruta: "translations.en.contact.address.street", clave: "address", campo: "contact.address.street" },
    { id: "brand.tagline.idiomas", ruta: "translations.en.brand.tagline", clave: "tagline", campo: "brand.tagline" },
  ];
  // (1) Las filas. Hoy no están: aquí está el rojo.
  for (const e of ESPERADAS) {
    const f = filas.find((x) => x.id === e.id);
    assert.ok(f, `verdad/contratos.json declara la fila ${e.id} (hoy: ${filas.length} filas, ninguna ${e.id})`);
    assert.deepEqual([f!.ruta, f!.clave, f!.validador?.funcion, f!.ui?.componente, f!.ui?.campo, f!.material?.vive], [e.ruta, e.clave, "validateTextosPorIdioma", "src/components/client-content-tab.tsx", e.campo, "config"], `${e.id}: ruta, clave, validador, casilla de Contenido y material en config`);
    assert.ok(f!.guard?.archivo, `${e.id}: guard en T`);
  }
  // (2) Los fixtures: la dirección de cada plantilla en la raíz y en los otros tres idiomas; la línea de la marca en los otros tres.
  for (const p of ["a", "c"] as const) {
    const fx = JSON.parse(fuente(`dev-fixtures/peluqueria-paleta-${p}.json`));
    const partes = (a: Record<string, string> | undefined) => [a?.street, a?.district, a?.cityStateZip];
    assert.deepEqual(partes(fx.contact?.address), [...DIRECCION[p].he], `${p}: la dirección simulada en la raíz`);
    for (const lang of ["en", "ru", "ar"] as const) {
      assert.deepEqual(partes(fx.translations?.[lang]?.contact?.address), [...DIRECCION[p][lang]], `${p}: la dirección en ${lang}`);
      const linea = fx.translations?.[lang]?.brand?.tagline;
      assert.ok(typeof linea === "string" && ESCRITURA[lang].test(linea), `${p}: brand.tagline en ${lang}, escrita en ese idioma («${linea}»)`);
    }
  }
  // (3) hueco.mjs: los cinco lugares de las dos.
  for (const e of ESPERADAS) {
    const r = spawnSync(NODE, ["tools/verdad/hueco.mjs", "--id", e.id], { cwd: ROOT, encoding: "utf8", windowsHide: true, timeout: 120000, env: entornoLimpio() });
    assert.equal(r.status, 0, `hueco.mjs --id ${e.id}: verde en los cinco (exit ${r.status})
${r.stdout}${r.stderr}`);
  }
});
