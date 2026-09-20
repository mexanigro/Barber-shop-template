// Mutación de tests/contrato-hooks.test.ts (VERDAD-01): quitar el hook veredicto --stop de .claude/settings.json debe poner rojo
// el guard (CLAUDE.md sigue declarando `cierre.mjs veredicto.mjs`). veredicto restaura el archivo byte a byte. Tolera CRLF (autocrlf).
const RE = /,\r?\n\s*\{ "type": "command", "command": "node tools\/verdad\/veredicto\.mjs --stop", "timeout": 30 \}/;
export default [
  { prueba: "CLAUDE.md declara exactamente los hooks presentes en .claude/settings.json, .githooks/ y npm prepare",
    archivo: ".claude/settings.json", descripcion: "Stop pierde veredicto --stop",
    aplicar: (s) => { if (!RE.test(s)) throw new Error("mutación: no encontré el hook veredicto --stop en .claude/settings.json"); return s.replace(RE, ""); } },
];
