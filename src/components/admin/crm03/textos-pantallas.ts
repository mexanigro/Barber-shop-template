// CRM-04 · diseño (prototipo en el clon de diseño, no en T): los textos del resto del panel —calendario, Pagos, Clientes, Equipo,
// Inventario, Usuarios, Mensajes, Registro de avisos, Reglas, la entrada y la pantalla sin acceso— en los cuatro idiomas, cada uno
// escrito como original (R24). Sigue a `textos.ts` (prototipo 1, aprobado por Liam el 2026-10-20). ponytail: módulo propio para mirar
// el diseño; en la orden van a `src/config/locales/*`.
import { localeConfig } from "../../../config/locale";

type L = "he" | "en" | "ru" | "ar";
const lang = (): L => (["he", "en", "ru", "ar"].includes(localeConfig.lang) ? localeConfig.lang : "en") as L;
type Formas = Partial<Record<Intl.LDMLPluralRule, string>> & { other: string };

const T = {
  he: {
    common: { close: "סגירה", cancel: "ביטול", save: "שמירה", retry: "ניסיון נוסף", saved: "נשמר", saving: "שומר…", search: "חיפוש", filter: "סינון", view: "תצוגה", yesterday: "אתמול", optional: "(לא חובה)", from: "מ־", to: "עד" },
    cal: {
      view: "תצוגת לוח", prevMonth: "החודש הקודם", nextMonth: "החודש הבא", prevWeek: "השבוע הקודם", nextWeek: "השבוע הבא", prevDay: "היום הקודם", nextDay: "היום הבא",
      pending: { one: "אחד ממתין לאישור", other: "{n} ממתינים לאישור" } as Formas, done: { one: "אחד הושלם", other: "{n} הושלמו" } as Formas,
      more: (n: number) => `עוד ${n}`, legendConfirmed: "מאושרים", legendPending: "ממתינים לאישור", legendDone: "הושלמו", tapDay: "לחיצה על יום פותחת את התורים שלו",
    },
    staff: {
      loadError: "לא הצלחנו לטעון את השעות השמורות. כדי לא לדרוס אותן, אי אפשר לשמור עד שהן נטענות.",
      intro: "כאן קובעים את שעות העבודה של כל מי שבצוות. מה שנשמר כאן הוא מה שמופיע באתר כשקובעים תור.",
      pick: "בחירה מהצוות", unsaved: "יש שינויים שלא נשמרו", saved: "נשמר ✓", allSaved: "הכל שמור",
      weekOf: (n: string) => `השבוע הקבוע של ${n}`, weekNote: "חוזר בכל שבוע. ליום מסוים אחר — בלוח של ימים מיוחדים.",
      workday: "יום עבודה", dayOff: "חופש", workdayOf: (d: string) => `${d}: יום עבודה`, break: "הפסקה",
      breakStart: (d: string, i: number) => `${d}: תחילת הפסקה ${i}`, breakEnd: (d: string, i: number) => `${d}: סוף הפסקה ${i}`,
      removeBreak: (i: number, d: string) => `הסרת הפסקה ${i} של ${d}`, copyAll: "העתקה לכל הימים",
      special: "ימים מיוחדים", specialNote: "חופש, שעות אחרות ביום מסוים — מקישים על התאריך.", legendOff: "יום חופש", legendCustom: "שעות מיוחדות",
      whatDay: "מה קורה ביום הזה", previewRegion: "תצוגה מקדימה של ההזמנה", previewTitle: "כך זה נראה בהזמנה",
      afterSave: " · אחרי השמירה", beforeBooked: " · לפני תורים שכבר נקבעו", service: "שירות",
      noSlots: "אין שעות פנויות ביום הזה.", pickOther: "אפשר לבחור תאריך בלוח כדי לראות יום אחר.",
      saveQ: (de: string) => `לשמור את השינויים של ${de}?`, saveQBody: (a: string, de: string) => `לפני שעוברים ל${a}: השינויים בלוח הזמנים של ${de} עוד לא נשמרו.`,
      saveAndGo: (a: string) => `שמירה ומעבר ל${a}`, goWithout: "מעבר בלי לשמור",
    },
    pay: {
      ranges: ["7 ימים", "30 ימים", "החודש"], online: "אונליין", notSet: "לא צוין", amountCsv: "סכום (₪)", period: "תקופה",
      collectedPeriod: "נגבה בתקופה", collectedToday: "נגבה היום", toCollect: "לגבייה", paidList: "שולמו", markPaid: "סמן כשולם",
      thWhen: "מתי", thClient: "שם", thWith: "עם", thAmount: "סכום",
      newTitle: "רישום תשלום בלי תור", name: "שם", phone: "טלפון",
      phoneNeeded: "צריך טלפון כדי לשמור — לפיו התשלום נשמר בכרטיס המתאים בלקוחות.", phoneHelp: "התשלום נשמר בכרטיס המתאים בלקוחות, לפי הטלפון.",
      amount: "סכום", method: "אמצעי תשלום", service: "שירות", who: "אצל מי", time: "שעה", date: "תאריך",
    },
    users: {
      sentOk: (e: string) => ["שלחנו הזמנה במייל אל ", e, ", עם קישור לכניסה. נכנסים עם חשבון הגוגל של הכתובת הזאת."] as const,
      sentWarn: (link: string, e: string) => ["ההזמנה נשמרה, אבל המייל לא יצא. צריך לשלוח את הקישור ", link, " אל ", e, ". נכנסים עם חשבון הגוגל של הכתובת הזאת."] as const,
      errOtherBusiness: "הכתובת הזאת כבר מנהלת עסק אחר. אפשר להזמין כתובת אחרת.", errInList: "הכתובת הזאת כבר ברשימה.",
      errEmail: "כתובת המייל לא נראית תקינה. כדאי לבדוק אותה ולנסות שוב.", errRole: "אין לך הרשאה לתת את התפקיד הזה.",
      sees: { owner: "הכל, כמו לבעלים: כולל תשלומים, משתמשים והגדרות. מתאים לשותפות בעסק.", manager: "הכל חוץ מניהול הבעלים, כולל הזמנה לצוות.", staff: "תורים, לקוחות, משימות, מלאי ותיבת הדואר. בלי תשלומים ובלי הגדרות." },
      seesRowOwner: "הכל, כולל תשלומים, משתמשים והגדרות.",
      role: { owner: "בעלים", manager: "ניהול", staff: "צוות" }, roleRow: { owner: "בעלים", manager: "ניהול", staff: "צוות" },
      intro: "למי יש גישה לניהול העסק, ומה רואים בכל תפקיד.", invite: "הזמנה לצוות",
      inviteNote: "תישלח הזמנה במייל. עד הכניסה הראשונה יופיע «הזמנה ממתינה».", email: "אימייל של גוגל", emailNote: "הכניסה היא עם החשבון של גוגל של המייל הזה.",
      seesLabel: "גישה:", removeBody: "· הגישה תיסגר. אפשר להזמין שוב בכל זמן.", onlyYou: "כרגע רק לך יש גישה. אפשר להזמין לצוות או לניהול.",
      you: "זה החשבון שלך", invitedOn: (d: string, by: string) => `הזמנה מ־${d}${by ? ` · על ידי ${by}` : ""}`,
      status: { active: "גישה פעילה", pending: "הזמנה ממתינה", removed: "הגישה הוסרה" },
    },
    logs: {
      motivo: {"direccion":"הכתובת לא קיימת או שכתובה לא נכון. כדאי לבדוק אותה בכרטיס, בלקוחות.","limite":"יצאו יותר מדי מיילים בבת אחת. ננסה שוב בשעה הבאה.","clave":"חסרה ההגדרה של המייל של האתר, או שהיא לא תקינה. כדאי לספר לנו ב«תמיכה».","dominio":"כתובת השולח של האתר עוד לא מאומתת. כדאי לספר לנו ב«תמיכה».","conexion":"לא היה חיבור לשירות המיילים. ננסה שוב בשעה הבאה.","otro":"המייל לא יצא."}, details: "פרטים טכניים",
      types: { booking: "אישור תור", reminder: "תזכורת", contact: "פנייה מהאתר", cancellation: "ביטול תור", reschedule: "שינוי מועד", digest: "סיכום יומי", marketing: "דיוור", invite: "הזמנה לצוות" } as Record<string, string>,
      otherType: "הודעה אחרת", sent: "נשלח", failed: "לא נשלח · נכשל", queued: "לא נשלח עדיין",
      intro: "כל אימייל שהאתר שלח או ניסה לשלוח: אישורי תור, תזכורות ופניות מהאתר.", status: "מצב", type: "סוג", pages: "עמודים",
      pageOf: (n: number, total: string, page: string, cur: number, all: number) => `${n} ${total} · ${page} ${cur} מתוך ${all}`, prevPage: "העמוד הקודם", nextPage: "העמוד הבא",
    },
    cust: {
      trato: { label: "לשון הפנייה", help: "כך הטקסטים כאן מתייחסים לאדם הזה.", f: "נקבה", m: "זכר", n: "בלי לציין" }, tratoError: "לא נשמר. אפשר לנסות שוב.",
      status: { confirmed: "מאושר", pending: "ממתין לאישור", completed: "התקיים", cancelled: "בוטל", expired: "פג תוקף" } as Record<string, string>,
      added: { f: "נוספה {d}", m: "נוסף {d}", n: "ברשימה מ־{d}" } as PorTrato, contact: "יצירת קשר", phone: "טלפון", email: "מייל", call: "חיוג", whatsapp: "וואטסאפ", mail: "מייל",
      stage: "שלב", herBookings: { f: "התורים שלה", m: "התורים שלו", n: "תורים" } as PorTrato, matchNote: "תורים עם אותו שם, טלפון ומייל.", noBookings: { f: "עוד אין תורים שתואמים לפרטים שלה.", m: "עוד אין תורים שתואמים לפרטים שלו.", n: "עוד אין תורים שתואמים לפרטים האלה." } as PorTrato,
      notes: "הערות", notesPh: { f: "מה חשוב לזכור עליה: צבע, רגישויות, העדפות…", m: "מה חשוב לזכור עליו: צבע, רגישויות, העדפות…", n: "מה חשוב לזכור: צבע, רגישויות, העדפות…" } as PorTrato, notesNote: "נשמר לבד בזמן הכתיבה. רואים את זה רק בניהול העסק.", notesError: "ההערות לא נשמרו.",
      tags: "תגיות", removeTag: (t: string) => `הסרת התגית ${t}`, newTag: "תגית חדשה", newTagPh: "תגית חדשה, למשל: כלה", add: "הוספה", tagsError: "התגיות לא נשמרו. אפשר לנסות שוב.",
      sources: { web: "טופס באתר", whatsapp: "וואטסאפ", instagram: "אינסטגרם", google: "גוגל", referral: "המלצה", manual: "הוספה ידנית", walkin: "הגעה ישירה", booking: "הזמנה באתר", import: "ייבוא", default: "אחר" } as Record<string, string>,
      lastVisit: "ביקור אחרון:", notYet: { f: "עוד לא הגיעה", m: "עוד לא הגיע", n: "עוד אין ביקור" } as PorTrato, callTo: (n: string) => `התקשרות ל${n}`, waTo: (n: string) => `וואטסאפ ל${n}`, mailTo: (n: string) => `אימייל ל${n}`,
      stageNow: (s: string) => `שלב: ${s}`, searchClient: "חיפוש לפי שם או טלפון", stages: "שלבים", byStage: "לפי שלב", list: "רשימה",
      loadError: "לא הצלחנו לטעון את הלקוחות.", loadErrorOld: " מה שמופיע כאן הוא מהטעינה הקודמת וייתכן שאינו מעודכן.",
    },
    stock: { products: { one: "מוצר אחד", other: "{n} מוצרים" } as Formas, lowLine: (n: string, q: number, m: number) => `${n}: נשארו ${q}, מינימום ${m}`, search: "חיפוש מוצר", edit: " — עריכה", min: (m: number) => `מינימום ${m}`, delete: "מחיקת המוצר" },
    inbox: { search: "חיפוש הודעה", byStatus: "סינון לפי מצב", message: "ההודעה", back: "חזרה להודעות", openWa: "פתיחה בוואטסאפ", openWaNote: "הוואטסאפ שלך נפתח עם ההודעה שכתבת, מוכנה לשליחה." },
    login: {
      popupClosed: "החלון של גוגל נסגר לפני שהכניסה הסתיימה. אפשר לנסות שוב.", notSetUp: "הכניסה לניהול עוד לא מוגדרת באתר הזה. דברו עם מי שבנה את האתר.",
      title: "ניהול העסק", missingTitle: "הכניסה לניהול עוד לא הוגדרה", missingBody: "צריך להגדיר את כתובת המייל של הבעלים בהגדרות האתר. דברו עם מי שבנה את האתר.",
      hint: "נכנסים עם חשבון הגוגל שהוזמן לניהול.", checkFailTitle: "לא הצלחנו לבדוק את הגישה", checkFailBody: "כנראה בעיה בחיבור. כדאי לבדוק את האינטרנט ולנסות שוב.",
      otherAccount: "כניסה עם חשבון אחר", noAccess: "נכנסים רק הבעלים ומי שהוזמנו. מהצוות? צריך לבקש הזמנה לכתובת הזאת, או להיכנס עם החשבון שהוזמן.",
    },
    misc: { whose: "של מי", rulesIntro: "ההגדרות האלה קובעות מתי אפשר לקבוע תור באתר." },
  },
  en: {
    common: { close: "Close", cancel: "Cancel", save: "Save", retry: "Try again", saved: "Saved", saving: "Saving…", search: "Search", filter: "Filter", view: "View", yesterday: "Yesterday", optional: "(optional)", from: "From", to: "to" },
    cal: {
      view: "Calendar view", prevMonth: "Previous month", nextMonth: "Next month", prevWeek: "Previous week", nextWeek: "Next week", prevDay: "Previous day", nextDay: "Next day",
      pending: { one: "1 to confirm", other: "{n} to confirm" } as Formas, done: { one: "1 done", other: "{n} done" } as Formas,
      more: (n: number) => `${n} more`, legendConfirmed: "Confirmed", legendPending: "To confirm", legendDone: "Done", tapDay: "Tap a day to see its bookings",
    },
    staff: {
      loadError: "We couldn't load the saved hours. Saving is off until they load, so nothing gets overwritten.",
      intro: "Set when each person on your team works. What you save here is what clients see when they book.",
      pick: "Choose a team member", unsaved: "Unsaved changes", saved: "Saved ✓", allSaved: "All saved",
      weekOf: (n: string) => `${n}'s regular week`, weekNote: "Repeats every week. For a one-off day, use Special days.",
      workday: "Working", dayOff: "Day off", workdayOf: (d: string) => `${d}: working day`, break: "Break",
      breakStart: (d: string, i: number) => `${d}: break ${i} starts`, breakEnd: (d: string, i: number) => `${d}: break ${i} ends`,
      removeBreak: (i: number, d: string) => `Remove break ${i} on ${d}`, copyAll: "Copy to all days",
      special: "Special days", specialNote: "A day off or different hours on one date: tap the date.", legendOff: "Day off", legendCustom: "Different hours",
      whatDay: "What happens on this day", previewRegion: "Booking preview", previewTitle: "What clients see when booking",
      afterSave: " · after saving", beforeBooked: " · before existing bookings", service: "Service",
      noSlots: "No free times on this day.", pickOther: "Pick a date on the calendar to see another day.",
      saveQ: (de: string) => `Save ${de}'s changes?`, saveQBody: (a: string, de: string) => `You're switching to ${a}, and ${de}'s schedule changes aren't saved yet.`,
      saveAndGo: (a: string) => `Save and go to ${a}`, goWithout: "Go without saving",
    },
    pay: {
      ranges: ["7 days", "30 days", "This month"], online: "Online", notSet: "Not recorded", amountCsv: "Amount (₪)", period: "Period",
      collectedPeriod: "Collected in period", collectedToday: "Collected today", toCollect: "Still owed", paidList: "Paid", markPaid: "Mark as paid",
      thWhen: "When", thClient: "Client", thWith: "With", thAmount: "Amount",
      newTitle: "Record a payment without a booking", name: "Client's name", phone: "Phone",
      phoneNeeded: "A phone number is needed to save. It's how the payment goes on the right client card.", phoneHelp: "The payment goes on the right client card, matched by phone.",
      amount: "Amount", method: "Paid by", service: "Service", who: "Done by", time: "Time", date: "Date",
    },
    users: {
      sentOk: (e: string) => ["We emailed an invitation to ", e, " with a sign-in link. They sign in with that address's Google account."] as const,
      sentWarn: (link: string, e: string) => ["The invitation is saved, but the email didn't go out. Send the link ", link, " to ", e, " yourself. They sign in with that address's Google account."] as const,
      errOtherBusiness: "That address already manages another business. Invite a different one.", errInList: "That address is already on the list.",
      errEmail: "That email address doesn't look right. Check it and try again.", errRole: "You don't have permission to give that role.",
      sees: { owner: "Everything you see, including payments, users and settings. For a partner, or whoever stands in for you.", manager: "Everything except managing owners. Can invite staff.", staff: "Bookings, clients, tasks, inventory and inbox. No payments, no settings." },
      seesRowOwner: "everything, including payments, users and settings.",
      role: { owner: "Co-owner", manager: "Manager", staff: "Staff" }, roleRow: { owner: "Owner", manager: "Manager", staff: "Staff" },
      intro: "Who can sign in to manage the business, and what each person sees.", invite: "Invite to the team",
      inviteNote: "We'll send an email invitation. Until they sign in for the first time, they show as “Waiting”.", email: "Google email", emailNote: "They sign in with the Google account for this email.",
      seesLabel: "Sees:", removeBody: "won't be able to sign in anymore. You can invite them again at any time.", onlyYou: "Only you can sign in right now. You can invite a staff member or a manager.",
      you: "That's you", invitedOn: (d: string, by: string) => `Invited ${d}${by ? ` · by ${by}` : ""}`,
      status: { active: "Active", pending: "Waiting to sign in", removed: "Removed" },
    },
    logs: {
      motivo: {"direccion":"That address doesn't exist or is misspelled. Check it on the client's card.","limite":"Too many emails went out at once. We'll try again next hour.","clave":"The website's email setup is missing or not valid. Let us know in Support.","dominio":"The website's sender address isn't verified yet. Let us know in Support.","conexion":"We couldn't reach the email service. We'll try again next hour.","otro":"The email didn't go out."}, details: "Technical details",
      types: { booking: "Booking confirmation", reminder: "Reminder", contact: "Website enquiry", cancellation: "Cancellation", reschedule: "New time", digest: "Daily summary", marketing: "Newsletter", invite: "Team invitation" } as Record<string, string>,
      otherType: "Other message", sent: "Sent", failed: "Not sent · failed", queued: "Not sent yet",
      intro: "Every email the website sent or tried to send: booking confirmations, reminders and website enquiries.", status: "Status", type: "Type", pages: "Pages",
      pageOf: (n: number, total: string, page: string, cur: number, all: number) => `${n} ${total} · ${page} ${cur} of ${all}`, prevPage: "Previous page", nextPage: "Next page",
    },
    cust: {
      trato: { label: "Refer to this person as", help: "How the text here talks about this person.", f: "She", m: "He", n: "Not set" }, tratoError: "That wasn't saved. Try again.",
      status: { confirmed: "Confirmed", pending: "Waiting to confirm", completed: "Happened", cancelled: "Cancelled", expired: "Expired" } as Record<string, string>,
      added: { f: "Added {d}", m: "Added {d}", n: "Added {d}" } as PorTrato, contact: "Contact", phone: "Phone", email: "Email", call: "Call", whatsapp: "WhatsApp", mail: "Email",
      stage: "Stage", herBookings: { f: "Her bookings", m: "His bookings", n: "Bookings" } as PorTrato, matchNote: "Bookings with the same name, phone and email.", noBookings: { f: "No bookings match her details yet.", m: "No bookings match his details yet.", n: "No bookings match these details yet." } as PorTrato,
      notes: "Notes", notesPh: { f: "Things to remember about her: colour formula, sensitivities, preferences…", m: "Things to remember about him: colour formula, sensitivities, preferences…", n: "Things to remember: colour formula, sensitivities, preferences…" } as PorTrato, notesNote: "Saves as you type. Only you and your team can see it.", notesError: "The notes weren't saved.",
      tags: "Tags", removeTag: (t: string) => `Remove tag ${t}`, newTag: "New tag", newTagPh: "New tag, e.g. bride", add: "Add", tagsError: "The tags weren't saved. You can try again.",
      sources: { web: "Website form", whatsapp: "WhatsApp", instagram: "Instagram", google: "Google", referral: "Referral", manual: "Added by hand", walkin: "Walked in", booking: "Booked online", import: "Imported", default: "Other" } as Record<string, string>,
      lastVisit: "Last visit:", notYet: { f: "Hasn't come in yet", m: "Hasn't come in yet", n: "Hasn't come in yet" } as PorTrato, callTo: (n: string) => `Call ${n}`, waTo: (n: string) => `WhatsApp ${n}`, mailTo: (n: string) => `Email ${n}`,
      stageNow: (s: string) => `Stage: ${s}`, searchClient: "Search by name or phone", stages: "Stages", byStage: "By stage", list: "List",
      loadError: "We couldn't load the clients.", loadErrorOld: " What you see is from the last load and may be out of date.",
    },
    stock: { products: { one: "1 product", other: "{n} products" } as Formas, lowLine: (n: string, q: number, m: number) => `${n}: ${q} left, minimum ${m}`, search: "Search products", edit: " — edit", min: (m: number) => `minimum ${m}`, delete: "Delete product" },
    inbox: { search: "Search messages", byStatus: "Filter by status", message: "Message", back: "Back to messages", openWa: "Open in WhatsApp", openWaNote: "Your WhatsApp opens with your message ready to send." },
    login: {
      popupClosed: "The Google window closed before you finished signing in. Try again.", notSetUp: "Sign-in isn't set up on this website yet. Contact whoever built the site.",
      title: "Business admin", missingTitle: "Admin sign-in isn't set up yet", missingBody: "The owner's email address needs to be set in the site settings. Contact whoever built the site.",
      hint: "Sign in with the Google account that was invited.", checkFailTitle: "We couldn't check your access", checkFailBody: "Probably a connection problem. Check your internet and try again.",
      otherAccount: "Sign in with another account", noAccess: "Only the owner and invited people can sign in. If you're on the team, ask for an invitation to this address, or sign in with the invited account.",
    },
    misc: { whose: "Whose", rulesIntro: "These settings decide when clients can book on the website." },
  },
  ru: {
    common: { close: "Закрыть", cancel: "Отмена", save: "Сохранить", retry: "Повторить", saved: "Сохранено", saving: "Сохраняем…", search: "Поиск", filter: "Фильтр", view: "Вид", yesterday: "Вчера", optional: "(необязательно)", from: "с", to: "до" },
    cal: {
      view: "Вид календаря", prevMonth: "Предыдущий месяц", nextMonth: "Следующий месяц", prevWeek: "Предыдущая неделя", nextWeek: "Следующая неделя", prevDay: "Предыдущий день", nextDay: "Следующий день",
      pending: { one: "ждёт подтверждения: {n}", other: "ждут подтверждения: {n}" } as Formas, done: { other: "выполнено: {n}" } as Formas,
      more: (n: number) => `ещё ${n}`, legendConfirmed: "Подтверждены", legendPending: "Ждут подтверждения", legendDone: "Выполнены", tapDay: "Нажмите на день, чтобы открыть его записи",
    },
    staff: {
      loadError: "Не удалось загрузить сохранённый график. Сохранение отключено до загрузки, чтобы ничего не затереть.",
      intro: "Здесь задаётся рабочее время команды, для каждого человека отдельно. При записи на сайте видно именно то, что сохранено здесь.",
      pick: "Выбор мастера", unsaved: "Есть несохранённые изменения", saved: "Сохранено ✓", allSaved: "Всё сохранено",
      weekOf: (n: string) => `Обычная неделя мастера ${n}`, weekNote: "Повторяется каждую неделю. Отдельный день — в календаре особых дней.",
      workday: "Рабочий", dayOff: "Выходной", workdayOf: (d: string) => `${d}: рабочий день`, break: "Перерыв",
      breakStart: (d: string, i: number) => `${d}: начало перерыва ${i}`, breakEnd: (d: string, i: number) => `${d}: конец перерыва ${i}`,
      removeBreak: (i: number, d: string) => `Убрать перерыв ${i}: ${d}`, copyAll: "На все дни",
      special: "Особые дни", specialNote: "Выходной или другие часы в конкретный день: нажмите на дату.", legendOff: "Выходной", legendCustom: "Другие часы",
      whatDay: "Что в этот день", previewRegion: "Как это видно при записи", previewTitle: "Так это видят при записи",
      afterSave: " · после сохранения", beforeBooked: " · без учёта уже сделанных записей", service: "Услуга",
      noSlots: "В этот день свободного времени нет.", pickOther: "Выберите дату в календаре, чтобы посмотреть другой день.",
      saveQ: (de: string) => `Сохранить изменения в графике мастера ${de}?`, saveQBody: (a: string, de: string) => `Вы переходите к мастеру ${a}, а изменения в графике мастера ${de} ещё не сохранены.`,
      saveAndGo: (_a: string) => "Сохранить и перейти", goWithout: "Перейти без сохранения",
    },
    pay: {
      ranges: ["7 дн.", "30 дн.", "Этот месяц"], online: "Онлайн", notSet: "Не указан", amountCsv: "Сумма (₪)", period: "Период",
      collectedPeriod: "Получено за период", collectedToday: "Получено сегодня", toCollect: "Не оплачено", paidList: "Оплачены", markPaid: "Отметить оплату",
      thWhen: "Когда", thClient: "Имя", thWith: "Мастер", thAmount: "Сумма",
      newTitle: "Оплата без записи", name: "Имя", phone: "Телефон",
      phoneNeeded: "Без телефона не сохранить: по нему оплата попадает в нужную карточку.", phoneHelp: "Оплата попадёт в нужную карточку по номеру телефона.",
      amount: "Сумма", method: "Способ оплаты", service: "Услуга", who: "Мастер", time: "Время", date: "Дата",
    },
    users: {
      sentOk: (e: string) => ["Приглашение отправлено на ", e, " со ссылкой для входа. Вход — через аккаунт Google этого адреса."] as const,
      sentWarn: (link: string, e: string) => ["Приглашение сохранено, но письмо не ушло. Отправьте ссылку ", link, " на ", e, " сами. Вход — через аккаунт Google этого адреса."] as const,
      errOtherBusiness: "Этот адрес уже управляет другим бизнесом. Пригласите другой.", errInList: "Этот адрес уже в списке.",
      errEmail: "Адрес почты выглядит неверно. Проверьте и попробуйте ещё раз.", errRole: "У вас нет права назначать эту роль.",
      sees: { owner: "Полный доступ, как у вас: оплаты, пользователи и настройки. Для совместного владения или замены на время отсутствия.", manager: "Всё, кроме прав владения, в том числе приглашения в команду.", staff: "Записи, клиенты, задачи, склад и входящие. Без оплат и настроек." },
      seesRowOwner: "всё, включая оплаты, пользователей и настройки.",
      role: { owner: "Полный доступ", manager: "Управление", staff: "Команда" }, roleRow: { owner: "Полный доступ", manager: "Управление", staff: "Команда" },
      intro: "У кого есть доступ к управлению бизнесом и что открыто для каждой роли.", invite: "Пригласить в команду",
      inviteNote: "Мы отправим приглашение на почту. До первого входа у приглашения будет статус «Ждёт входа».", email: "Почта Google", emailNote: "Вход — через аккаунт Google этой почты.",
      seesLabel: "Доступ:", removeBody: "больше не сможет войти. Пригласить снова можно в любой момент.", onlyYou: "Сейчас доступ есть только у вас. Можно пригласить в команду или в управление.",
      you: "Это вы", invitedOn: (d: string, by: string) => `Приглашение от ${d}${by ? ` · отправитель: ${by}` : ""}`,
      status: { active: "Доступ открыт", pending: "Ждёт входа", removed: "Доступ закрыт" },
    },
    logs: {
      motivo: {"direccion":"Такого адреса нет или он написан с ошибкой. Проверьте его в карточке, в разделе «Клиенты».","limite":"Слишком много писем сразу. Попробуем снова в следующий час.","clave":"Почта сайта не настроена или настроена неверно. Напишите нам в «Поддержку».","dominio":"Адрес отправителя сайта ещё не подтверждён. Напишите нам в «Поддержку».","conexion":"Не удалось связаться с почтовым сервисом. Попробуем снова в следующий час.","otro":"Письмо не ушло."}, details: "Технические подробности",
      types: { booking: "Подтверждение записи", reminder: "Напоминание", contact: "Обращение с сайта", cancellation: "Отмена записи", reschedule: "Перенос записи", digest: "Сводка дня", marketing: "Рассылка", invite: "Приглашение в команду" } as Record<string, string>,
      otherType: "Другое сообщение", sent: "Отправлено", failed: "Не отправлено · ошибка", queued: "Ещё не отправлено",
      intro: "Все письма, которые сайт отправил или пытался отправить: подтверждения, напоминания и обращения с сайта.", status: "Статус", type: "Тип", pages: "Страницы",
      pageOf: (n: number, total: string, page: string, cur: number, all: number) => `${n} ${total} · ${page} ${cur} из ${all}`, prevPage: "Предыдущая страница", nextPage: "Следующая страница",
    },
    cust: {
      trato: { label: "Как писать об этом человеке", help: "От этого зависят формы слов здесь: «пришла» или «пришёл».", f: "Она", m: "Он", n: "Не указано" }, tratoError: "Не сохранилось. Попробуйте ещё раз.",
      status: { confirmed: "Подтверждена", pending: "Ждёт подтверждения", completed: "Состоялась", cancelled: "Отменена", expired: "Истекла" } as Record<string, string>,
      added: { f: "Добавлена {d}", m: "Добавлен {d}", n: "В списке с {d}" } as PorTrato, contact: "Связаться", phone: "Телефон", email: "Почта", call: "Позвонить", whatsapp: "WhatsApp", mail: "Почта",
      stage: "Этап", herBookings: { f: "Её записи", m: "Его записи", n: "Записи" } as PorTrato, matchNote: "Записи с тем же именем, телефоном и почтой.", noBookings: { f: "Пока нет записей с её данными.", m: "Пока нет записей с его данными.", n: "Пока нет записей с этими данными." } as PorTrato,
      notes: "Заметки", notesPh: { f: "Что важно помнить о ней: формула цвета, чувствительность, пожелания…", m: "Что важно помнить о нём: формула цвета, чувствительность, пожелания…", n: "Что важно помнить: формула цвета, чувствительность, пожелания…" } as PorTrato, notesNote: "Сохраняется само, пока вы пишете. Видите только вы и команда.", notesError: "Заметки не сохранились.",
      tags: "Метки", removeTag: (t: string) => `Убрать метку ${t}`, newTag: "Новая метка", newTagPh: "Новая метка, например: невеста", add: "Добавить", tagsError: "Метки не сохранились. Попробуйте ещё раз.",
      sources: { web: "Форма на сайте", whatsapp: "WhatsApp", instagram: "Instagram", google: "Google", referral: "Рекомендация", manual: "Вручную", walkin: "Без записи", booking: "Запись на сайте", import: "Импорт", default: "Другое" } as Record<string, string>,
      lastVisit: "Последний визит:", notYet: { f: "Ещё не приходила", m: "Ещё не приходил", n: "Визитов пока нет" } as PorTrato, callTo: (n: string) => `Позвонить: ${n}`, waTo: (n: string) => `WhatsApp: ${n}`, mailTo: (n: string) => `Письмо: ${n}`,
      stageNow: (s: string) => `Этап: ${s}`, searchClient: "Поиск по имени или телефону", stages: "Этапы", byStage: "По этапам", list: "Список",
      loadError: "Не удалось загрузить клиентов.", loadErrorOld: " Здесь данные с прошлой загрузки, они могут быть устаревшими.",
    },
    stock: { products: { one: "{n} товар", few: "{n} товара", many: "{n} товаров", other: "{n} товара" } as Formas, lowLine: (n: string, q: number, m: number) => `${n}: осталось ${q}, минимум ${m}`, search: "Поиск товара", edit: " — изменить", min: (m: number) => `минимум ${m}`, delete: "Удалить товар" },
    inbox: { search: "Поиск сообщения", byStatus: "Фильтр по статусу", message: "Сообщение", back: "К сообщениям", openWa: "Открыть в WhatsApp", openWaNote: "WhatsApp откроется с вашим сообщением, готовым к отправке." },
    login: {
      popupClosed: "Окно Google закрылось до окончания входа. Попробуйте ещё раз.", notSetUp: "Вход в управление на этом сайте ещё не настроен. Обратитесь к тому, кто делал сайт.",
      title: "Управление бизнесом", missingTitle: "Вход в управление ещё не настроен", missingBody: "В настройках сайта нужно указать почту для входа в управление. Обратитесь к тому, кто делал сайт.",
      hint: "Вход — через аккаунт Google, который пригласили.", checkFailTitle: "Не удалось проверить доступ", checkFailBody: "Скорее всего, проблема со связью. Проверьте интернет и попробуйте ещё раз.",
      otherAccount: "Войти с другим аккаунтом", noAccess: "Входить могут только владельцы и приглашённые. Если вы из команды, попросите приглашение на этот адрес или войдите с приглашённым аккаунтом.",
    },
    misc: { whose: "Чьи", rulesIntro: "Эти настройки определяют, когда можно записаться на сайте." },
  },
  ar: {
    common: { close: "إغلاق", cancel: "إلغاء", save: "حفظ", retry: "إعادة المحاولة", saved: "تم الحفظ", saving: "جارٍ الحفظ…", search: "بحث", filter: "تصفية", view: "طريقة العرض", yesterday: "أمس", optional: "(اختياري)", from: "من", to: "إلى" },
    cal: {
      view: "طريقة عرض التقويم", prevMonth: "الشهر السابق", nextMonth: "الشهر التالي", prevWeek: "الأسبوع السابق", nextWeek: "الأسبوع التالي", prevDay: "اليوم السابق", nextDay: "اليوم التالي",
      pending: { one: "موعد واحد بانتظار التأكيد", two: "موعدان بانتظار التأكيد", other: "{n} بانتظار التأكيد" } as Formas, done: { one: "موعد واحد تمّ", two: "موعدان تمّا", other: "{n} تمّت" } as Formas,
      more: (n: number) => `${n} أخرى`, legendConfirmed: "مؤكَّدة", legendPending: "بانتظار التأكيد", legendDone: "تمّت", tapDay: "الضغط على يوم يفتح مواعيده",
    },
    staff: {
      loadError: "تعذّر تحميل الساعات المحفوظة. الحفظ متوقف حتى تُحمَّل، كي لا يُستبدل شيء.",
      intro: "هنا يُحدَّد متى يعمل كل فرد في الفريق. ما يُحفظ هنا هو ما يظهر في الموقع عند الحجز.",
      pick: "اختيار فرد من الفريق", unsaved: "هناك تغييرات لم تُحفظ", saved: "تم الحفظ ✓", allSaved: "كل شيء محفوظ",
      weekOf: (n: string) => `الأسبوع المعتاد لـ${n}`, weekNote: "يتكرر كل أسبوع. ليوم بعينه: تقويم الأيام الخاصة.",
      workday: "يوم عمل", dayOff: "عطلة", workdayOf: (d: string) => `${d}: يوم عمل`, break: "استراحة",
      breakStart: (d: string, i: number) => `${d}: بداية الاستراحة ${i}`, breakEnd: (d: string, i: number) => `${d}: نهاية الاستراحة ${i}`,
      removeBreak: (i: number, d: string) => `حذف الاستراحة ${i} يوم ${d}`, copyAll: "نسخ لكل الأيام",
      special: "أيام خاصة", specialNote: "عطلة أو ساعات مختلفة في يوم بعينه: بالضغط على التاريخ.", legendOff: "يوم عطلة", legendCustom: "ساعات خاصة",
      whatDay: "ماذا في هذا اليوم", previewRegion: "معاينة الحجز", previewTitle: "هكذا يبدو عند الحجز",
      afterSave: " · بعد الحفظ", beforeBooked: " · قبل احتساب المواعيد المحجوزة", service: "الخدمة",
      noSlots: "لا أوقات متاحة في هذا اليوم.", pickOther: "يمكن اختيار تاريخ في التقويم لرؤية يوم آخر.",
      saveQ: (de: string) => `حفظ تغييرات ${de}؟`, saveQBody: (a: string, de: string) => `قبل الانتقال إلى ${a}: تغييرات جدول ${de} لم تُحفظ بعد.`,
      saveAndGo: (a: string) => `حفظ والانتقال إلى ${a}`, goWithout: "الانتقال دون حفظ",
    },
    pay: {
      ranges: ["7 أيام", "30 يومًا", "هذا الشهر"], online: "عبر الإنترنت", notSet: "غير محدد", amountCsv: "المبلغ (₪)", period: "الفترة",
      collectedPeriod: "المُحصَّل في الفترة", collectedToday: "المُحصَّل اليوم", toCollect: "غير مدفوع", paidList: "مدفوعة", markPaid: "تسجيل الدفع",
      thWhen: "متى", thClient: "الاسم", thWith: "مع", thAmount: "المبلغ",
      newTitle: "تسجيل دفعة بلا موعد", name: "الاسم", phone: "الهاتف",
      phoneNeeded: "الهاتف مطلوب للحفظ، فبه تُسجَّل الدفعة في البطاقة المناسبة.", phoneHelp: "تُسجَّل الدفعة في البطاقة المناسبة حسب رقم الهاتف.",
      amount: "المبلغ", method: "طريقة الدفع", service: "الخدمة", who: "لدى مَن", time: "الساعة", date: "التاريخ",
    },
    users: {
      sentOk: (e: string) => ["أُرسلت دعوة بالبريد إلى ", e, " مع رابط للدخول. يكون الدخول بحساب Google لهذا العنوان."] as const,
      sentWarn: (link: string, e: string) => ["حُفظت الدعوة لكن البريد لم يُرسل. يُرجى إرسال الرابط ", link, " إلى ", e, ". يكون الدخول بحساب Google لهذا العنوان."] as const,
      errOtherBusiness: "هذا العنوان يدير نشاطًا آخر. يمكن دعوة عنوان مختلف.", errInList: "هذا العنوان موجود في القائمة.",
      errEmail: "عنوان البريد لا يبدو صحيحًا. يُرجى التحقق منه والمحاولة مجددًا.", errRole: "لا صلاحية لمنح هذا الدور.",
      sees: { owner: "صلاحيات كاملة، بما فيها المدفوعات والمستخدمون والإعدادات. للشراكة في العمل أو للإنابة.", manager: "كل شيء ما عدا صلاحيات الملكية، بما في ذلك الدعوة إلى الفريق.", staff: "المواعيد والزبائن والمهام والمخزون والوارد. بلا مدفوعات ولا إعدادات." },
      seesRowOwner: "كل شيء، بما فيه المدفوعات والمستخدمون والإعدادات.",
      role: { owner: "صلاحيات كاملة", manager: "إدارة", staff: "فريق العمل" }, roleRow: { owner: "صلاحيات كاملة", manager: "إدارة", staff: "فريق العمل" },
      intro: "لمن صلاحية دخول إدارة النشاط، وما المتاح لكل دور.", invite: "دعوة إلى الفريق",
      inviteNote: "ستُرسل دعوة بالبريد. وحتى أول دخول تظهر الدعوة «بانتظار الدخول».", email: "بريد Google", emailNote: "يكون الدخول بحساب Google لهذا البريد.",
      seesLabel: "المتاح:", removeBody: "· ستُغلق الصلاحية. يمكن إرسال دعوة جديدة في أي وقت.", onlyYou: "الصلاحية الآن لحسابك وحده. يمكن الدعوة إلى الفريق أو الإدارة.",
      you: "هذا حسابك", invitedOn: (d: string, by: string) => `دعوة بتاريخ ${d}${by ? ` · من ${by}` : ""}`,
      status: { active: "الصلاحية مفعّلة", pending: "بانتظار الدخول", removed: "أُزيلت الصلاحية" },
    },
    logs: {
      motivo: {"direccion":"هذا العنوان غير موجود أو مكتوب بشكل خاطئ. يُرجى التحقق منه في البطاقة ضمن «الزبائن».","limite":"أُرسلت رسائل كثيرة دفعة واحدة. سنحاول مجددًا في الساعة التالية.","clave":"إعداد بريد الموقع ناقص أو غير صالح. يُرجى إخبارنا في «الدعم».","dominio":"عنوان المرسل للموقع لم يُوثَّق بعد. يُرجى إخبارنا في «الدعم».","conexion":"تعذّر الوصول إلى خدمة البريد. سنحاول مجددًا في الساعة التالية.","otro":"لم يُرسل البريد."}, details: "تفاصيل تقنية",
      types: { booking: "تأكيد موعد", reminder: "تذكير", contact: "استفسار من الموقع", cancellation: "إلغاء موعد", reschedule: "تغيير موعد", digest: "ملخص يومي", marketing: "نشرة بريدية", invite: "دعوة إلى الفريق" } as Record<string, string>,
      otherType: "رسالة أخرى", sent: "أُرسل", failed: "لم يُرسل · فشل", queued: "لم يُرسل بعد",
      intro: "سجلّ كل بريد من الموقع، ما أُرسل منه وما لم يُرسَل: تأكيدات المواعيد والتذكيرات واستفسارات الموقع.", status: "الحالة", type: "النوع", pages: "الصفحات",
      pageOf: (n: number, total: string, page: string, cur: number, all: number) => `${n} ${total} · ${page} ${cur} من ${all}`, prevPage: "الصفحة السابقة", nextPage: "الصفحة التالية",
    },
    cust: {
      trato: { label: "صيغة الحديث عن هذا الشخص", help: "تحدّد كيف تشير النصوص هنا إلى هذا الشخص.", f: "مؤنث", m: "مذكر", n: "دون تحديد" }, tratoError: "لم يُحفظ. يمكن المحاولة مجددًا.",
      status: { confirmed: "مؤكَّد", pending: "بانتظار التأكيد", completed: "تمّ", cancelled: "أُلغي", expired: "انتهت صلاحيته" } as Record<string, string>,
      added: { f: "أُضيفت {d}", m: "أُضيف {d}", n: "في القائمة منذ {d}" } as PorTrato, contact: "التواصل", phone: "الهاتف", email: "البريد", call: "اتصال", whatsapp: "واتساب", mail: "بريد",
      stage: "المرحلة", herBookings: { f: "مواعيدها", m: "مواعيده", n: "المواعيد" } as PorTrato, matchNote: "مواعيد بنفس الاسم والهاتف والبريد.", noBookings: { f: "لا مواعيد تطابق بياناتها بعد.", m: "لا مواعيد تطابق بياناته بعد.", n: "لا مواعيد تطابق هذه البيانات بعد." } as PorTrato,
      notes: "ملاحظات", notesPh: { f: "ما يجب تذكّره عنها: تركيبة اللون، الحساسية، التفضيلات…", m: "ما يجب تذكّره عنه: تركيبة اللون، الحساسية، التفضيلات…", n: "ما يجب تذكّره: تركيبة اللون، الحساسية، التفضيلات…" } as PorTrato, notesNote: "تُحفظ تلقائيًا أثناء الكتابة. يراها الفريق فقط.", notesError: "لم تُحفظ الملاحظات.",
      tags: "وسوم", removeTag: (t: string) => `حذف الوسم ${t}`, newTag: "وسم جديد", newTagPh: "وسم جديد، مثل: عروس", add: "إضافة", tagsError: "لم تُحفظ الوسوم. يمكن المحاولة مجددًا.",
      sources: { web: "نموذج الموقع", whatsapp: "واتساب", instagram: "إنستغرام", google: "Google", referral: "توصية", manual: "إضافة يدوية", walkin: "حضور مباشر", booking: "حجز من الموقع", import: "استيراد", default: "غير ذلك" } as Record<string, string>,
      lastVisit: "آخر زيارة:", notYet: { f: "لم تأتِ بعد", m: "لم يأتِ بعد", n: "لا زيارات بعد" } as PorTrato, callTo: (n: string) => `اتصال بـ${n}`, waTo: (n: string) => `واتساب لـ${n}`, mailTo: (n: string) => `بريد إلى ${n}`,
      stageNow: (s: string) => `المرحلة: ${s}`, searchClient: "بحث بالاسم أو الهاتف", stages: "المراحل", byStage: "حسب المرحلة", list: "قائمة",
      loadError: "تعذّر تحميل الزبائن.", loadErrorOld: " ما يظهر هنا من التحميل السابق وقد لا يكون محدّثًا.",
    },
    stock: { products: { zero: "لا منتجات", one: "منتج واحد", two: "منتجان", few: "{n} منتجات", many: "{n} منتجًا", other: "{n} منتج" } as Formas, lowLine: (n: string, q: number, m: number) => `${n}: بقي ${q}، الحد الأدنى ${m}`, search: "بحث عن منتج", edit: " — تعديل", min: (m: number) => `الحد الأدنى ${m}`, delete: "حذف المنتج" },
    inbox: { search: "بحث عن رسالة", byStatus: "تصفية حسب الحالة", message: "الرسالة", back: "العودة إلى الرسائل", openWa: "فتح في واتساب", openWaNote: "يفتح واتساب ورسالتك جاهزة للإرسال." },
    login: {
      popupClosed: "أُغلقت نافذة Google قبل إتمام الدخول. يمكن المحاولة مجددًا.", notSetUp: "الدخول إلى الإدارة غير مُعدّ في هذا الموقع بعد. يُرجى التواصل مع مَن بنى الموقع.",
      title: "إدارة النشاط", missingTitle: "الدخول إلى الإدارة غير مُعدّ بعد", missingBody: "يجب ضبط بريد الدخول إلى الإدارة في إعدادات الموقع. يُرجى التواصل مع مَن بنى الموقع.",
      hint: "الدخول بحساب Google الذي وصلته الدعوة.", checkFailTitle: "تعذّر التحقق من الصلاحية", checkFailBody: "غالبًا مشكلة في الاتصال. يُرجى التحقق من الإنترنت والمحاولة مجددًا.",
      otherAccount: "الدخول بحساب آخر", noAccess: "الدخول لأصحاب العمل والمدعوّين فقط. لمن في الفريق: يُرجى طلب دعوة لهذا العنوان، أو الدخول بالحساب المدعو.",
    },
    misc: { whose: "لِمَن", rulesIntro: "هذه الإعدادات تحدد متى يمكن الحجز في الموقع." },
  },
};

export type TextosPantallas = typeof T.he;
/** Los textos del resto del panel en el idioma activo. */
export const tp = (): TextosPantallas => T[lang()] as unknown as TextosPantallas;
/** El motivo de un aviso que no salió, en el idioma del panel; el texto del proveedor queda plegado en «פרטים». */
export function motivoDeAviso(error: string): string {
  const m = tp().logs.motivo, e = error.toLowerCase();
  if (/noemail\.local|5\.1\.1|does not exist|invalid.*(address|recipient|email)|recipient.*invalid|mailbox unavailable|no such user/.test(e)) return m.direccion;
  if (/429|rate limit|too many/.test(e)) return m.limite;
  if (/domain.*(not verified|verify)|verify a domain|not verified/.test(e)) return m.dominio;
  if (/401|403|api key|unauthori[sz]ed|forbidden|missing.*key/.test(e)) return m.clave;
  if (/timeout|timed out|econn|enotfound|network|fetch failed/.test(e)) return m.conexion;
  return m.otro;
}
/** Cómo se habla de una persona (R31): f = femenino, m = masculino; sin dato o «n», sin suponer el género. */
export type Trato = "f" | "m" | "n";
type PorTrato = { f: string; m: string; n: string };
/** La forma del texto según el trato de esa persona; {d} se reemplaza por `d`. */
export function segun(formas: PorTrato, trato?: Trato | null, d = ""): string {
  return formas[trato === "f" || trato === "m" ? trato : "n"].replace("{d}", d);
}
/** Plural por las reglas del idioma activo. */
export function pl(n: number, f: Formas): string {
  return (f[new Intl.PluralRules(lang()).select(n)] ?? f.other).replace("{n}", String(n));
}
