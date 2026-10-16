// CRM-03 · diseño (clon de diseño): los emails de un turno, escritos en hebreo, inglés, ruso y árabe como originales (R24, D-302).
// A la clienta: confirmacion, cancelacion, cambio, recordatorio — en el idioma de su reserva. A la dueña: nuevoTurno, resumen,
// invitacion — en el idioma base. HTML de email (tablas y estilos en línea, sin <style>): lang y dir del idioma, la fecha como una hoja
// de calendario (mes arriba, el número grande, el día de la semana), los datos de la clienta siempre escapados.

export type Idioma = "he" | "en" | "ru" | "ar";
export type TipoEmail = "confirmacion" | "cancelacion" | "cambio" | "recordatorio" | "nuevoTurno" | "resumen" | "invitacion";
export type DatosEmail = {
  negocio: string;
  cliente?: string;
  servicio?: string;
  /** yyyy-MM-dd */
  fecha?: string;
  /** HH:mm */
  hora?: string;
  conQuien?: string;
  direccion?: string;
  telefono?: string;
  /** Al panel (dueña) o a la web para reservar (clienta). */
  enlace?: string;
  turnos?: { hora: string; cliente: string; servicio: string }[];
  /** El color de la marca para el botón y el acento (por defecto, un verde oscuro con contraste sobre blanco). */
  color?: string;
};

const esc = (s: unknown) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
const RTL = (l: Idioma) => l === "he" || l === "ar";
const fechaDe = (iso?: string) => { const [y, m, d] = (iso ?? "").split("-").map(Number); return y ? new Date(y, m - 1, d) : null; };
const fechaLarga = (l: Idioma, iso?: string) => { const d = fechaDe(iso); return d ? new Intl.DateTimeFormat(l, { weekday: "long", day: "numeric", month: "long" }).format(d) : ""; };
const fechaCorta = (l: Idioma, iso?: string) => { const d = fechaDe(iso); return d ? new Intl.DateTimeFormat(l, { day: "numeric", month: "short" }).format(d) : ""; };

type Textos = { asunto: string; titulo: string; intro: string; nota?: string; boton?: string };
type Etiquetas = { servicio: string; fecha: string; hora: string; con: string; donde: string; pie: (n: string) => string; equipo: string };

const ET: Record<Idioma, Etiquetas> = {
  he: { servicio: "שירות", fecha: "תאריך", hora: "שעה", con: "עם", donde: "כתובת", pie: (n) => `קיבלת את המייל הזה כי קבעת תור אצל ${n}.`, equipo: "המייל נשלח ממערכת הניהול של העסק." },
  en: { servicio: "Service", fecha: "Date", hora: "Time", con: "With", donde: "Address", pie: (n) => `You're receiving this email because you booked at ${n}.`, equipo: "Sent from your business dashboard." },
  ru: { servicio: "Услуга", fecha: "Дата", hora: "Время", con: "Мастер", donde: "Адрес", pie: (n) => `Вы получили это письмо, потому что записались: ${n}.`, equipo: "Письмо отправлено из панели управления." },
  ar: { servicio: "الخدمة", fecha: "التاريخ", hora: "الوقت", con: "مع", donde: "العنوان", pie: (n) => `وصلتك هذه الرسالة لأنك حجزت موعدًا لدى ${n}.`, equipo: "أُرسلت هذه الرسالة من لوحة إدارة العمل." },
};

function cuantos(l: Idioma, n: number): string {
  if (l === "he") return n === 1 ? "תור אחד" : `${n} תורים`;
  if (l === "en") return n === 1 ? "1 appointment" : `${n} appointments`;
  if (l === "ru") { const f = new Intl.PluralRules("ru").select(n); return `${n} ${f === "one" ? "запись" : f === "few" ? "записи" : "записей"}`; }
  return `عدد المواعيد: ${n}`;
}

function textos(tipo: TipoEmail, l: Idioma, d: DatosEmail): Textos {
  const n = d.negocio, c = d.cliente ?? "", h = d.hora ?? "", fc = fechaCorta(l, d.fecha), k = d.turnos?.length ?? 0;
  // Qué y cuándo, para el asunto de la confirmación: «תספורת, 18 באוק׳ ב־10:00».
  const cuando = fc && h ? { he: `${fc} ב־${h}`, en: `${fc} at ${h}`, ru: `${fc} в ${h}`, ar: `${fc} الساعة ${h}` }[l] : "";
  const que = [d.servicio, cuando].filter(Boolean).join(l === "ar" ? "، " : ", ");
  const T: Record<Idioma, Record<TipoEmail, Textos>> = {
    he: {
      confirmacion: { asunto: que ? `התור שלך נקבע: ${que} — ${n}` : `התור שלך נקבע — ${n}`, titulo: "התור שלך נקבע", intro: `שלום ${c}, מחכים לך.`, nota: "צריך לשנות או לבטל? אפשר פשוט להשיב למייל הזה." },
      cancelacion: { asunto: `התור שלך בוטל — ${n}`, titulo: "התור בוטל", intro: `שלום ${c}, התור הזה בוטל.`, nota: "רוצה לקבוע מועד אחר? נשמח לראות אותך.", boton: "לקביעת תור חדש" },
      cambio: { asunto: `מועד חדש לתור שלך — ${n}`, titulo: "התור שלך עבר למועד חדש", intro: `שלום ${c}, אלה הפרטים המעודכנים:`, nota: "המועד לא מתאים? אפשר להשיב למייל הזה." },
      recordatorio: { asunto: `תזכורת: מחר ב-${h} — ${n}`, titulo: "נתראה מחר", intro: `שלום ${c}, רק מזכירים את התור של מחר.`, nota: "אם לא מתאים, כדאי להודיע מראש — אפשר להשיב למייל הזה." },
      nuevoTurno: { asunto: `תור חדש: ${c} · ${fc} ${h}`, titulo: "תור חדש", intro: "נקבע תור חדש דרך האתר.", boton: "פתיחת היומן" },
      resumen: { asunto: `הלו״ז של היום · ${cuantos("he", k)}`, titulo: fechaLarga("he", d.fecha), intro: k ? `${cuantos("he", k)} היום, לפי השעה:` : "אין תורים היום.", boton: "פתיחת היומן" },
      invitacion: { asunto: `הוזמנת לניהול ${n}`, titulo: `הוזמנת לניהול ${n}`, intro: "קיבלת גישה למערכת הניהול של העסק: התורים, הלקוחות וכל מה שצריך ליום העבודה.", nota: "הכניסה היא עם חשבון הגוגל של כתובת המייל הזאת.", boton: "כניסה לניהול" },
    },
    en: {
      confirmacion: { asunto: que ? `Booked: ${que} — ${n}` : `Your appointment at ${n} is booked`, titulo: "You're booked", intro: `Hi ${c}, we're looking forward to seeing you.`, nota: "Need to change or cancel? Just reply to this email." },
      cancelacion: { asunto: `Your appointment at ${n} was cancelled`, titulo: "Appointment cancelled", intro: `Hi ${c}, this appointment has been cancelled.`, nota: "Want another time? We'd love to see you.", boton: "Book again" },
      cambio: { asunto: `New time for your appointment at ${n}`, titulo: "Your appointment has moved", intro: `Hi ${c}, here are the updated details:`, nota: "Doesn't work for you? Just reply to this email." },
      recordatorio: { asunto: `Reminder: tomorrow at ${h} at ${n}`, titulo: "See you tomorrow", intro: `Hi ${c}, a quick reminder about tomorrow's appointment.`, nota: "Can't make it? Please let us know ahead of time — just reply to this email." },
      nuevoTurno: { asunto: `New booking: ${c} · ${fc} ${h}`, titulo: "New booking", intro: "A new appointment was booked on your website.", boton: "Open the calendar" },
      resumen: { asunto: `Today's schedule · ${cuantos("en", k)}`, titulo: fechaLarga("en", d.fecha), intro: k ? `${cuantos("en", k)} today, by time:` : "No appointments today.", boton: "Open the calendar" },
      invitacion: { asunto: `You're invited to manage ${n}`, titulo: `You're invited to manage ${n}`, intro: "You now have access to the business dashboard: appointments, clients and everything you need for the workday.", nota: "Sign in with the Google account for this email address.", boton: "Sign in" },
    },
    ru: {
      confirmacion: { asunto: que ? `Запись подтверждена: ${que} — ${n}` : `Запись подтверждена — ${n}`, titulo: "Вы записаны", intro: `Здравствуйте, ${c}! Будем рады вас видеть.`, nota: "Нужно перенести или отменить? Просто ответьте на это письмо." },
      cancelacion: { asunto: `Запись отменена — ${n}`, titulo: "Запись отменена", intro: `Здравствуйте, ${c}! Эта запись отменена.`, nota: "Хотите выбрать другое время? Будем рады вас видеть.", boton: "Записаться снова" },
      cambio: { asunto: `Новое время записи — ${n}`, titulo: "Время записи изменилось", intro: `Здравствуйте, ${c}! Вот обновлённые данные:`, nota: "Не подходит? Просто ответьте на это письмо." },
      recordatorio: { asunto: `Напоминание: завтра в ${h} — ${n}`, titulo: "До встречи завтра", intro: `Здравствуйте, ${c}! Напоминаем о завтрашней записи.`, nota: "Не получится прийти? Пожалуйста, предупредите заранее — просто ответьте на это письмо." },
      nuevoTurno: { asunto: `Новая запись: ${c} · ${fc} ${h}`, titulo: "Новая запись", intro: "Через сайт оформлена новая запись.", boton: "Открыть журнал записей" },
      resumen: { asunto: `Расписание на сегодня · ${cuantos("ru", k)}`, titulo: fechaLarga("ru", d.fecha), intro: k ? `Сегодня ${cuantos("ru", k)}, по времени:` : "Сегодня записей нет.", boton: "Открыть журнал записей" },
      invitacion: { asunto: `Приглашение в панель управления — ${n}`, titulo: "Вас пригласили в панель управления", intro: `Вам открыт доступ к панели «${n}»: записи, клиенты и всё, что нужно для работы.`, nota: "Входите через аккаунт Google с этим адресом почты.", boton: "Войти" },
    },
    ar: {
      confirmacion: { asunto: que ? `تم تأكيد موعدك: ${que} — ${n}` : `تم تأكيد موعدك — ${n}`, titulo: "تم تأكيد موعدك", intro: `مرحبًا ${c}، يسعدنا استقبالك.`, nota: "للتغيير أو الإلغاء، يكفي الرد على هذه الرسالة." },
      cancelacion: { asunto: `تم إلغاء موعدك — ${n}`, titulo: "تم إلغاء الموعد", intro: `مرحبًا ${c}، تم إلغاء هذا الموعد.`, nota: "لحجز موعد آخر، يسعدنا استقبالك.", boton: "حجز موعد جديد" },
      cambio: { asunto: `موعد جديد لزيارتك — ${n}`, titulo: "تم تغيير موعدك", intro: `مرحبًا ${c}، هذه هي التفاصيل المحدّثة:`, nota: "إذا لم يناسبك الموعد، يكفي الرد على هذه الرسالة." },
      recordatorio: { asunto: `تذكير: غدًا الساعة ${h} — ${n}`, titulo: "نراك غدًا", intro: `مرحبًا ${c}، نذكّرك بموعد الغد.`, nota: "إذا تعذّر عليك الحضور، يُرجى إبلاغنا مسبقًا بالرد على هذه الرسالة." },
      nuevoTurno: { asunto: `حجز جديد: ${c} · ${fc} ${h}`, titulo: "حجز جديد", intro: "تم حجز موعد جديد عبر الموقع.", boton: "فتح جدول المواعيد" },
      resumen: { asunto: `جدول اليوم · ${cuantos("ar", k)}`, titulo: fechaLarga("ar", d.fecha), intro: k ? `${cuantos("ar", k)}، حسب الوقت:` : "لا توجد مواعيد اليوم.", boton: "فتح جدول المواعيد" },
      invitacion: { asunto: `دعوة لإدارة ${n}`, titulo: `دعوة لإدارة ${n}`, intro: "أصبح لديك وصول إلى لوحة إدارة العمل: المواعيد والعملاء وكل ما تحتاجه ليوم العمل.", nota: "سجّل الدخول بحساب غوغل المرتبط بهذا البريد.", boton: "تسجيل الدخول" },
    },
  };
  return T[l][tipo];
}

/** La hoja de calendario: el mes como encabezado de página (forma de calendario), el número grande y el día de la semana. */
function hoja(l: Idioma, iso: string | undefined, color: string): string {
  const d = fechaDe(iso);
  if (!d) return "";
  const mes = new Intl.DateTimeFormat(l, { month: "long" }).format(d);
  const dia = new Intl.DateTimeFormat(l, { day: "numeric" }).format(d);
  const sem = new Intl.DateTimeFormat(l, { weekday: "long" }).format(d);
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="width:96px;border-collapse:separate;border:1px solid #e3e3df;border-radius:12px;overflow:hidden;text-align:center"><tr><td style="background:${color};color:#ffffff;font-size:13px;line-height:18px;padding:5px 6px">${esc(mes)}</td></tr><tr><td style="font-size:34px;line-height:40px;font-weight:700;color:#1c1c1a;padding:8px 6px 0">${esc(dia)}</td></tr><tr><td style="font-size:13px;line-height:18px;color:#5b5b55;padding:0 6px 8px">${esc(sem)}</td></tr></table>`;
}

export function emailTurno(tipo: TipoEmail, idioma: Idioma, datosEntrada: DatosEmail): { subject: string; html: string } {
  const datos: DatosEmail = { ...datosEntrada, enlace: /^https:\/\//i.test(datosEntrada.enlace ?? "") ? datosEntrada.enlace : undefined };
  const l: Idioma = (["he", "en", "ru", "ar"] as const).includes(idioma) ? idioma : "he";
  const t = textos(tipo, l, datos);
  const et = ET[l];
  const color = /^#[0-9a-f]{6}$/i.test(datos.color ?? "") ? datos.color! : "#2f5d46";
  const rtl = RTL(l), inicio = rtl ? "right" : "left";
  const fuente = "font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,'Noto Sans Hebrew','Noto Sans Arabic',sans-serif";
  const p = (s: string, extra = "") => `<p style="margin:0 0 12px;font-size:16px;line-height:24px;color:#1c1c1a;${extra}">${s}</p>`;
  const tachar = tipo === "cancelacion" ? "text-decoration:line-through;" : "";
  const fila = (k: string, v?: string, ltr = false) => (v ? `<tr><td style="padding:3px 0;font-size:14px;line-height:20px;color:#5b5b55;width:72px;vertical-align:top">${esc(k)}</td><td style="padding:3px 0;font-size:16px;line-height:22px;color:#1c1c1a;font-weight:600;${tachar}"${ltr ? ' dir="ltr"' : ""}>${esc(v)}</td></tr>` : "");
  const boton = (texto?: string, href?: string) => (texto && href ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 4px"><tr><td style="border-radius:12px;background:${color}"><a href="${esc(href)}" style="display:inline-block;padding:13px 22px;font-size:16px;line-height:20px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:12px">${esc(texto)}</a></td></tr></table>` : "");

  const deClienta = tipo === "confirmacion" || tipo === "cancelacion" || tipo === "cambio" || tipo === "recordatorio";
  let cuerpo = "";
  if (deClienta || tipo === "nuevoTurno") {
    cuerpo = `<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border:1px solid #e3e3df;border-radius:14px;background:#fafaf8"><tr><td style="padding:14px;width:96px;vertical-align:top">${hoja(l, datos.fecha, color)}</td><td style="padding:14px 4px 14px 14px;vertical-align:top"><table role="presentation" cellpadding="0" cellspacing="0" style="width:100%">${tipo === "nuevoTurno" ? fila(l === "he" ? "שם" : l === "ru" ? "Клиент" : l === "ar" ? "الاسم" : "Name", datos.cliente) : ""}${fila(et.servicio, datos.servicio)}${fila(et.hora, datos.hora, true)}${fila(et.con, datos.conQuien)}${deClienta ? fila(et.donde, datos.direccion) : ""}</table></td></tr></table>`;
  } else if (tipo === "resumen") {
    cuerpo = datos.turnos?.length
      ? `<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border:1px solid #e3e3df;border-radius:14px;background:#fafaf8">${datos.turnos.map((x, i) => `<tr><td dir="ltr" style="padding:10px 14px;${i ? "border-top:1px solid #e3e3df;" : ""}font-size:16px;line-height:22px;font-weight:700;color:#1c1c1a;width:56px;text-align:${inicio}">${esc(x.hora)}</td><td style="padding:10px 14px 10px 0;${i ? "border-top:1px solid #e3e3df;" : ""}font-size:16px;line-height:22px;color:#1c1c1a"><strong>${esc(x.cliente)}</strong><br><span style="color:#5b5b55;font-size:14px">${esc(x.servicio)}</span></td></tr>`).join("")}</table>`
      : "";
  }

  const html = `<!doctype html>
<html lang="${l}" dir="${rtl ? "rtl" : "ltr"}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${esc(t.asunto)}</title></head>
<body style="margin:0;padding:0;background:#f1f1ee;${fuente}">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f1ee"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" dir="${rtl ? "rtl" : "ltr"}" style="max-width:560px;background:#ffffff;border-radius:18px;text-align:${inicio};${fuente}">
<tr><td style="padding:24px 24px 0;font-size:14px;line-height:20px;color:#5b5b55;font-weight:600">${esc(datos.negocio)}</td></tr>
<tr><td style="padding:8px 24px 0"><h1 style="margin:0 0 12px;font-size:24px;line-height:30px;color:#1c1c1a;font-weight:700">${esc(t.titulo)}</h1>${p(esc(t.intro))}</td></tr>
${cuerpo ? `<tr><td style="padding:4px 24px 8px">${cuerpo}</td></tr>` : ""}
<tr><td style="padding:12px 24px 8px">${t.nota ? p(esc(t.nota), "color:#3d3d39") : ""}${boton(t.boton, datos.enlace)}${tipo === "invitacion" && datos.enlace ? p(`<span dir="ltr" style="font-size:13px;color:#5b5b55">${esc(datos.enlace)}</span>`) : ""}</td></tr>
<tr><td style="padding:12px 24px 24px;border-top:1px solid #ececea;font-size:13px;line-height:19px;color:#6b6b64">${esc(deClienta ? et.pie(datos.negocio) : et.equipo)}${deClienta && datos.telefono ? `<br><span dir="ltr">${esc(datos.telefono)}</span>` : ""}</td></tr>
</table></td></tr></table></body></html>`;
  return { subject: t.asunto, html };
}

// ─── Los datos de un turno para sus emails (los dos runtimes y el cron) ────────────────────────────────────────────────────────
const IDIOMAS_EMAIL: Idioma[] = ["he", "en", "ru", "ar"];
/** El idioma de un turno (`lang`) si es uno de los cuatro; si no, el base. */
export const idiomaDe = (lang: unknown, base: Idioma): Idioma => (IDIOMAS_EMAIL.includes(lang as Idioma) ? (lang as Idioma) : base);
/** El idioma base de la web (VITE_UI_LANGUAGE), hebreo por defecto. */
export const idiomaBaseDe = (env: Record<string, string | undefined>): Idioma => idiomaDe(env.VITE_UI_LANGUAGE?.trim(), "he");
/** El nombre del negocio: brand.name, business.name o el de las variables del build. */
export function negocioDe(config: any, env: Record<string, string | undefined> = {}): string {
  const n = config?.brand?.name || config?.business?.name || env.VITE_BRAND_NAME || "";
  return typeof n === "string" ? n.trim() : "";
}
/**
 * El nombre de un servicio o una persona en ese idioma: translations.<lang>.<lista> (objeto por id o lista con id, como en la web), si
 * no el de la raíz, si no el id.
 */
export function nombreEnIdioma(config: any, lista: "services" | "staff", id: string, idioma: Idioma, base: Idioma): string {
  const raiz = (Array.isArray(config?.[lista]) ? config[lista] : []).find((s: any) => s?.id === id);
  if (idioma !== base) {
    const capa = config?.translations?.[idioma]?.[lista];
    const t = Array.isArray(capa) ? capa.find((s: any) => s?.id === id) : capa?.[id];
    if (typeof t?.name === "string" && t.name.trim()) return t.name.trim();
  }
  return typeof raiz?.name === "string" && raiz.name.trim() ? raiz.name.trim() : id;
}
