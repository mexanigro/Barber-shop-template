/**
 * Contrato template-anon-tolerance-v1: la decisión de acceso del gate de
 * `src/services/tenant.ts` frente a la lectura de clients/{id}.
 *
 * tenant.ts importa firebase/firestore y config del navegador, así que no se
 * carga entero bajo node:test. Igual que booking-handler.test.ts, se extraen
 * por AST las funciones puras `isPermissionDenied` y `resolveTenantAccess`,
 * se transpilan y se ejecutan en una VM. Si el nombre o la firma cambian, el
 * test lo dice: no es un test de texto, es la función real.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";

const root = new URL("../", import.meta.url);

function loadPure(): { resolveTenantAccess: (read: unknown) => { access: string; status?: string } } {
  const text = readFileSync(new URL("src/services/tenant.ts", root), "utf8");
  const source = ts.createSourceFile("tenant.ts", text, ts.ScriptTarget.Latest, true);
  const wanted = new Set(["isPermissionDenied", "resolveTenantAccess"]);
  const parts: string[] = [];
  ts.forEachChild(source, (node) => {
    if (ts.isFunctionDeclaration(node) && node.name && wanted.has(node.name.text)) parts.push(node.getText(source));
  });
  assert.equal(parts.length, 2, "tenant.ts debe declarar isPermissionDenied y resolveTenantAccess como funciones");
  const js = ts.transpileModule(parts.join("\n") + "\nexports.resolveTenantAccess = resolveTenantAccess;", {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const exportsObj: Record<string, unknown> = {};
  runInNewContext(js, { exports: exportsObj });
  return exportsObj as ReturnType<typeof loadPure>;
}

const pure = loadPure();
// Los objetos nacen en la VM (otro realm): se comparan por estructura, no por prototipo.
const resolveTenantAccess = (read: unknown) => JSON.parse(JSON.stringify(pure.resolveTenantAccess(read)));

test("anónimo: permission-denied en clients/{id} → allowed/active (comportamiento de 6c07d7a)", () => {
  const r = resolveTenantAccess({ status: "rejected", reason: { code: "permission-denied", message: "Missing or insufficient permissions." } });
  assert.deepEqual(r, { access: "allowed", status: "active" });
});

test("error de red u otro fallo → unavailable (guarda de N03 L05)", () => {
  assert.equal(resolveTenantAccess({ status: "rejected", reason: { code: "unavailable", message: "network" } }).access, "unavailable");
  assert.equal(resolveTenantAccess({ status: "rejected", reason: new Error("boom") }).access, "unavailable");
  assert.equal(resolveTenantAccess({ status: "rejected", reason: undefined }).access, "unavailable");
});

test("timeout (expired) → unavailable", () => {
  assert.equal(resolveTenantAccess({ status: "expired" }).access, "unavailable");
});

test("documento leído (identidad admin): lo que diga el documento", () => {
  assert.deepEqual(resolveTenantAccess({ status: "fulfilled", value: "active" }), { access: "allowed", status: "active" });
  assert.deepEqual(resolveTenantAccess({ status: "fulfilled", value: "trial" }), { access: "allowed", status: "trial" });
  assert.deepEqual(resolveTenantAccess({ status: "fulfilled", value: "maintenance" }), { access: "allowed", status: "maintenance" });
  assert.deepEqual(resolveTenantAccess({ status: "fulfilled", value: "suspended" }), { access: "blocked", status: "suspended" });
  assert.deepEqual(resolveTenantAccess({ status: "fulfilled", value: "archived" }), { access: "blocked", status: "archived" });
});

test("documento leído pero ausente o con status desconocido → unavailable (como hoy)", () => {
  assert.equal(resolveTenantAccess({ status: "fulfilled", value: undefined }).access, "unavailable");
  assert.equal(resolveTenantAccess({ status: "fulfilled", value: "demo" }).access, "unavailable");
  assert.equal(resolveTenantAccess({ status: "fulfilled", value: 42 }).access, "unavailable");
});

test("bootstrapTenantConfig decide con resolveTenantAccess (cableado real)", () => {
  const text = readFileSync(new URL("src/services/tenant.ts", root), "utf8");
  const source = ts.createSourceFile("tenant.ts", text, ts.ScriptTarget.Latest, true);
  let calls = 0;
  function visit(node: ts.Node): void {
    if (ts.isCallExpression(node) && node.expression.getText(source) === "resolveTenantAccess") calls++;
    ts.forEachChild(node, visit);
  }
  visit(source);
  assert.equal(calls, 1, "bootstrapTenantConfig debe llamar a resolveTenantAccess exactamente una vez");
});
