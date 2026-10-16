// CRM-03 · diseño: el número de WhatsApp (wa.me) de un teléfono israelí, en un solo lugar (antes había cuatro copias y una sola
// regla «0 → 972», que con «00972…» armaba «97200972…»). wa.me quiere sólo dígitos, con el código de país y sin el 0.
export function waNumero(telefono: string): string {
  let d = (telefono ?? "").replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2); // 00972 50 … → 972 50 …
  if (d.startsWith("0")) d = `972${d.slice(1)}`; // 050 … → 972 50 …
  return d;
}

export function waEnlace(telefono: string, texto = ""): string {
  return `https://wa.me/${waNumero(telefono)}${texto.trim() ? `?text=${encodeURIComponent(texto.trim())}` : ""}`;
}
