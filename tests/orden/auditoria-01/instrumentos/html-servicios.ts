// AUDITORIA-01 · A1 · el HTML que pinta services v6 (`renderToString` de `ServicesV6` con el config por defecto del árbol), para comparar
// el árbol del commit rojo con HEAD (Liam: B saca `Card` y `Price` del render SIN cambiar el HTML que pintan). Uso:
//   node --experimental-strip-types html-servicios.ts <raíz del árbol>
// Imprime una sola línea JSON: { html }. No escribe nada.
import { register } from "node:module";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { fuenteCargadorTsx } from "../_comun.ts";

const raiz = resolve(process.argv[2] ?? "");
register("data:text/javascript," + encodeURIComponent(fuenteCargadorTsx(raiz)), { parentURL: pathToFileURL(raiz + "/").href });
const req = createRequire(resolve(raiz, "package.json"));
const { renderToString } = req("react-dom/server") as { renderToString: (n: unknown) => string };
const { createElement } = req("react") as { createElement: (c: unknown, p: unknown) => unknown };
const mod = (await import(pathToFileURL(resolve(raiz, "src/components/landing/services/services-v6.tsx")).href)) as Record<string, unknown>;
const html = renderToString(createElement(mod.ServicesV6, { onBookClick: () => {}, onNavigateToServices: () => {} }));
process.stdout.write(JSON.stringify({ html }) + "\n");
