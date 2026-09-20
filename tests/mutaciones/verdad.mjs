// Mutaciones de tests/verdad.test.ts (VERDAD-01). Cada entrada nombra la prueba que DEBE poner roja, el archivo que rompe y
// cómo. veredicto.mjs las aplica una a una: escribe el archivo mutado → corre la prueba (rojo) → restaura → corre (verde).
// Una mutación que no pone rojo marca la afirmación como FALSO: esa prueba no prueba nada.
const cambia = (de, a) => (s) => { if (!s.includes(de)) throw new Error(`mutación: no encontré «${de.slice(0, 60)}»`); return s.replace(de, a); };

export default [
  { prueba: "esquema: una afirmación sin prueba, con vista fuera de {375,1280,webkit} o sin hueco declarado no pasa; la de ejemplo sí",
    archivo: "tools/verdad/veredicto.mjs", descripcion: "el esquema deja de exigir los campos required",
    aplicar: cambia('for (const k of esquema.required ?? []) if (!(k in valor))', 'for (const k of []) if (!(k in valor))') },
  { prueba: "mutación: la prueba debe correr (0 tests = no existe), la mutación debe poner rojo y volver verde; una que no pone rojo es FALSO; sin archivo de mutación → null",
    archivo: "tools/verdad/veredicto.mjs", descripcion: "el motor da por rojo cualquier mutación",
    aplicar: cambia("const fueRojo = rojo.exit !== 0 || rojo.fail > 0;", "const fueRojo = true;") },
  { prueba: "evidencia: capturas exigidas = id × paleta × vista; la que falta se marca FALTA y la presente lleva su sha256",
    archivo: "tools/verdad/veredicto.mjs", descripcion: "una captura ausente pasa como presente",
    aplicar: cambia(": { nombre, falta: true }", ': { nombre, hash: "0".repeat(64) }') },
  { prueba: "impacto: compartido tocado → seis + todas las secciones; v6 tocado → sólo peluquería y su sección; helper sin clasificar sube hasta el primer clasificado; tests y capturas obligatorias por lo alcanzado",
    archivo: "tools/verdad/impacto.mjs", descripcion: "index.css deja de ser compartido",
    aplicar: cambia("if (COMPARTIDOS.includes(f)) { c.compartido = true; return c; }", "if (false) { c.compartido = true; return c; }") },
  { prueba: "hueco: una fila con UI del hub inexistente, validador sin la función o material bajo /dev-fixtures no está hecha; una fila con los cinco reales sí",
    archivo: "tools/verdad/hueco.mjs", descripcion: "una ruta del hub sin page.tsx cuenta como montada",
    aplicar: cambia("if (!fs.existsSync(page)) c.ui =", "if (false) c.ui =") },
  { prueba: "recrear: un campo sólo del fixture (sin fila en contratos.json) es una brecha con hueco null; los cubiertos no; huecoDe encuentra el hueco por el valor del material",
    archivo: "tools/verdad/recrear.mjs", descripcion: "los campos sin contrato dejan de ser brecha",
    aplicar: cambia("return hojas(fx).filter((h) =>", "return [].filter((h) =>") },
  { prueba: "gama 1.7: con foto del local (R24) servicio y retrato no miden F («—»); sin ella sí; una excepción de Liam convierte una medida NO en exc y la fila pasa; incompleta no cuenta",
    archivo: "tools/gama.mjs", descripcion: "F vuelve a medirse bajo R24 (fondo: true siempre)",
    aplicar: (s) => { const m = s.split("fondo: !escena").length - 1; if (m !== 2) throw new Error(`esperaba 2 «fondo: !escena», hay ${m}`); return s.replaceAll("fondo: !escena", "fondo: true"); } },
  { prueba: "gama 1.7: con foto del local (R24) servicio y retrato no miden F («—»); sin ella sí; una excepción de Liam convierte una medida NO en exc y la fila pasa; incompleta no cuenta",
    archivo: "tools/gama.mjs", descripcion: "las excepciones no cambian ninguna celda",
    aplicar: cambia('if (r[ex.medida] === false) { r[ex.medida] = "exc";', 'if (false) { r[ex.medida] = "exc";') },
  { prueba: "higiene-03: Edit/Write dentro de T o H = escribió; git commit en shell = escribió; cat/grep/git status = sólo lectura; sin transcript = sin-transcript (falla cerrado)",
    archivo: "tools/_transcript.mjs", descripcion: "Edit/Write dejan de contar como escritura",
    aplicar: cambia("if (EDITORES.has(u.name)) {", "if (false) {") },
  { prueba: "candado: verdad/*.md y verdad/*.json se pueden escribir; una captura .png en verdad/ sigue vetada (capturas sólo en public/)",
    archivo: "tools/candado.mjs", descripcion: "las capturas fuera de public/ pasan",
    aplicar: cambia('if (MEDIA.test(base) && !rel.startsWith("public/")', 'if (false && !rel.startsWith("public/")') },
];
