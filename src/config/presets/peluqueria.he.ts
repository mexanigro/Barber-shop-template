import type { NichePreset, WorkDay } from "../../types";
import { presetThemePeluqueria } from "./themes";

// Peluquería (BLOQUE-04, brief bloque-03): catálogo finito de 12 servicios con
// rango de precio (price = mínimo, priceMax = tope) y modo reserva|consulta.
// Duraciones y rangos: fuentes [13]–[19] de bloque-03/fuentes.md.

const IMG = "https://images.unsplash.com/photo-";
const q = "?auto=format&fit=crop&q=80&w=";

const WEEKDAY: WorkDay = { isOpen: true, hours: { start: "09:00", end: "20:00" }, breaks: [{ start: "14:00", end: "14:30", label: "הפסקה" }] };
const FRIDAY: WorkDay = { isOpen: true, hours: { start: "08:00", end: "14:00" }, breaks: [] };
const CLOSED: WorkDay = { isOpen: false, hours: { start: "00:00", end: "00:00" }, breaks: [] };

export const peluqueriaPresetHe: NichePreset = {
  businessMode: "team",
  business: {
    type: "peluqueria",
    legalName: "סטודיו לשיער",
    address: "",
    cancellationPolicy: "ביטול חינם עד 24 שעות לפני התור; ביטול מאוחר או אי־הגעה — 50% מעלות השירות",
  },

  brand: {
    name: "סטודיו לשיער",
    tagline: "תספורת, צבע ופן",
    description:
      "מספרה לנשים: תספורות, צבע ובליאז׳, פן, החלקות ותסרוקות לאירועים ולכלות. קובעים תור אונליין או שולחים תמונה בוואטסאפ לייעוץ.",
    logoIconName: "Scissors",
    faviconEmoji: "💇‍♀️",
    ogImage: `${IMG}1600948836101-f9ffda59d250${q}1200`,
    aiPersona:
      "את העוזרת הווירטואלית של מספרת נשים. עני בחום ובקצרה על שירותים, משכי זמן ומחירים לפי המחירון, והציעי לקבוע תור אונליין או לשלוח תמונה בוואטסאפ לייעוץ צבע והחלקה.",
  },

  theme: presetThemePeluqueria,

  hero: {
    titlePrefix: "הסטודיו",
    titleHighlight: "לשיער שלך",
    titleSuffix: "",
    eyebrow: "מספרה לנשים",
    subtitle: "תספורת, צבע, פן ותסרוקות לאירועים. תור אונליין או תמונה בוואטסאפ.",
    ctaPrimary: "לקביעת תור",
    ctaSecondary: "ייעוץ בוואטסאפ",
    backgroundImage: `${IMG}1600948836101-f9ffda59d250${q}2000`,
  },

  contact: {
    address: {
      street: "",
      district: "",
      cityStateZip: "",
    },
    phone: "+972 3-000-0000",
    email: "hello@example.com",
    social: {},
  },

  hours: {
    sunday: { start: "09:00", end: "20:00" },
    monday: { start: "09:00", end: "20:00" },
    tuesday: { start: "09:00", end: "20:00" },
    wednesday: { start: "09:00", end: "20:00" },
    thursday: { start: "09:00", end: "20:00" },
    friday: { start: "08:00", end: "14:00" },
    saturday: null,
  },

  // ─── Catálogo PEL (12) ──────────────────────────────────────────────────────
  // services[i] ↔ sections.services.images[i]
  services: [
    { id: "cut", name: "תספורת אישה", description: "ייעוץ קצר, חפיפה, תספורת מדויקת וייבוש. לכל אורך ולכל מרקם.", duration: 60, price: 120, priceMax: 350, mode: "reserva" },
    { id: "cut-blowdry", name: "תספורת + פן", description: "תספורת מלאה עם פן מעוצב לסיום — יוצאת מוכנה.", duration: 90, price: 150, priceMax: 450, mode: "reserva" },
    { id: "blowdry", name: "פן", description: "חפיפה ופן חלק או גלי, לפי האורך. המחיר לפי אורך השיער.", duration: 45, price: 50, priceMax: 160, mode: "reserva" },
    { id: "root-color", name: "צבע שורש", description: "כיסוי שורש בצבע מקצועי, כולל חפיפה וייבוש. מומלץ כל 4–6 שבועות.", duration: 90, price: 130, priceMax: 300, mode: "reserva" },
    { id: "full-color", name: "צבע ראש מלא", description: "צבע אחיד מהשורש עד הקצוות, עם טיפול לחות לסיום.", duration: 120, price: 180, priceMax: 600, mode: "reserva" },
    { id: "highlights", name: "גוונים / בליאז׳", description: "הבהרה מדורגת ומעברים טבעיים. המחיר נקבע לפי אורך, צפיפות ומצב השיער — שלחי תמונה ונחזור עם הצעה.", duration: 180, price: 600, priceMax: 1500, mode: "consulta", popular: true },
    { id: "straightening", name: "החלקה (קרטין / אורגנית)", description: "החלקה שמחזיקה 4–6 חודשים. משך הטיפול ומחירו תלויים באורך ובמצב השיער — נדרש ייעוץ מראש.", duration: 240, price: 600, priceMax: 2500, mode: "consulta" },
    { id: "treatment", name: "טיפול שיער (לחות / שיקום)", description: "טיפול עומק לשיער יבש, פגום או אחרי צבע. כולל פן.", duration: 60, price: 580, priceMax: 1100, mode: "reserva" },
    { id: "event-style", name: "תסרוקת לאירוע", description: "אסוף, גלים או תסרוקת חלקה לאירוע. מומלץ להגיע עם שיער חפוף מהיום הקודם.", duration: 90, price: 250, priceMax: 800, mode: "reserva" },
    { id: "bride", name: "תסרוקת כלה + ניסיון", description: "פגישת ניסיון ותסרוקת ביום החתונה. המחיר לפי התסרוקת והמיקום — נתאם בשיחה.", duration: 120, price: 800, priceMax: 2500, mode: "consulta" },
    { id: "kids-cut", name: "תספורת ילדים", description: "תספורת לילדים עד גיל 12, בסבלנות ובשעות הבוקר השקטות.", duration: 30, price: 86, priceMax: 216, mode: "reserva" },
    { id: "consult", name: "ייעוץ ואבחון", description: "10–15 דקות לאבחון השיער ותכנון צבע, החלקה או שינוי גדול. מקוזז מהטיפול.", duration: 15, price: 0, priceMax: 250, mode: "reserva" },
  ],

  staff: [
    {
      id: "noa",
      slug: "noa-levi",
      name: "נועה לוי",
      photoUrl: `${IMG}1544717305-2782549b5136${q}800`,
      specialty: "צבע, בליאז׳ והבהרות",
      bio: "בעלת הסטודיו. 14 שנים בצבע ובהבהרות, עם דגש על מעברים טבעיים ושיער שנשאר בריא אחרי הצבע.",
      portfolio: [
        `${IMG}1492106087820-71f1a00d2b11${q}1200`,
        `${IMG}1470259078422-826894b933aa${q}1200`,
        `${IMG}1508214751196-bcfd4ca60f91${q}1200`,
        `${IMG}1524502397800-2eeaad7c3fe5${q}1200`,
      ],
      schedule: { sunday: WEEKDAY, monday: WEEKDAY, tuesday: WEEKDAY, wednesday: WEEKDAY, thursday: WEEKDAY, friday: FRIDAY, saturday: CLOSED },
    },
    {
      id: "maya",
      slug: "maya-cohen",
      name: "מאיה כהן",
      photoUrl: `${IMG}1531746020798-e6953c6e8e04${q}800`,
      specialty: "תספורות ושיער מתולתל",
      bio: "מתמחה בתספורות לפי מרקם — ובעיקר בתלתלים. חותכת יבש כשצריך, ומלמדת איך לשמור על התוצאה בבית.",
      portfolio: [
        `${IMG}1519699047748-de8e457a634e${q}1200`,
        `${IMG}1562322140-8baeececf3df${q}1200`,
        `${IMG}1616683693504-3ea7e9ad6fec${q}1200`,
        `${IMG}1580618672591-eb180b1a973f${q}1200`,
      ],
      schedule: { sunday: WEEKDAY, monday: WEEKDAY, tuesday: CLOSED, wednesday: WEEKDAY, thursday: WEEKDAY, friday: FRIDAY, saturday: CLOSED },
    },
    {
      id: "dana",
      slug: "dana-mizrahi",
      name: "דנה מזרחי",
      photoUrl: `${IMG}1508214751196-bcfd4ca60f91${q}800`,
      specialty: "תסרוקות לאירועים וכלות",
      bio: "תסרוקות שמחזיקות עד סוף הלילה. פגישת ניסיון לכל כלה, והגעה ללוקיישן ביום האירוע.",
      portfolio: [
        `${IMG}1560869713-7d0a29430803${q}1200`,
        `${IMG}1519741497674-6114818635${q}1200`,
        `${IMG}1523263685509-57c1d050d19b${q}1200`,
        `${IMG}1502823403499-6ccfcf4fb453${q}1200`,
      ],
      schedule: { sunday: CLOSED, monday: WEEKDAY, tuesday: WEEKDAY, wednesday: WEEKDAY, thursday: WEEKDAY, friday: FRIDAY, saturday: CLOSED },
    },
  ],

  testimonials: [
    { name: "שירה ב.", title: "לקוחה", text: "באתי עם תמונה בוואטסאפ, נועה אמרה בדיוק מה אפשר ומה לא, והבליאז׳ יצא בדיוק כמו בתמונה. השיער נשאר רך אחרי ההבהרה.", rating: 5 },
    { name: "נטע ק.", title: "לקוחה", text: "סוף סוף מישהי שמבינה תלתלים. מאיה חתכה יבש, הסבירה מה לעשות בבית, ופעם ראשונה שאני יוצאת מהמספרה בלי לאסוף את השיער.", rating: 5 },
    { name: "מיכל א.", title: "לקוחה", text: "תסרוקת לחתונה של אחותי — פגישת ניסיון שבוע לפני, וביום עצמו הכול לפי הזמן. החזיקה עד ארבע לפנות בוקר.", rating: 5 },
  ],

  gallery: [
    `${IMG}1470259078422-826894b933aa${q}1200`,
    `${IMG}1492106087820-71f1a00d2b11${q}1200`,
    `${IMG}1508214751196-bcfd4ca60f91${q}1200`,
    `${IMG}1519699047748-de8e457a634e${q}1200`,
    `${IMG}1524502397800-2eeaad7c3fe5${q}1200`,
    `${IMG}1616683693504-3ea7e9ad6fec${q}1200`,
    `${IMG}1562322140-8baeececf3df${q}1200`,
    `${IMG}1580618672591-eb180b1a973f${q}1200`,
    `${IMG}1595476108010-b4d1f102b1b1${q}1200`,
    `${IMG}1634449571010-02389ed0f9b0${q}1200`,
    `${IMG}1600948836101-f9ffda59d250${q}1200`,
    `${IMG}1521590832167-7bcbfaa6381f${q}1200`,
  ],

  sections: {
    services: {
      title: "מה עושים אצלנו",
      subtitle: "שירותים ומחירון",
      images: [
        `${IMG}1562322140-8baeececf3df${q}600`,
        `${IMG}1580618672591-eb180b1a973f${q}600`,
        `${IMG}1560869713-7d0a29430803${q}600`,
        `${IMG}1595476108010-b4d1f102b1b1${q}600`,
        `${IMG}1492106087820-71f1a00d2b11${q}600`,
        `${IMG}1524502397800-2eeaad7c3fe5${q}600`,
        `${IMG}1470259078422-826894b933aa${q}600`,
        `${IMG}1620331311520-246422fd82f9${q}600`,
        `${IMG}1508214751196-bcfd4ca60f91${q}600`,
        `${IMG}1519741497674-611481863552${q}600`,
        `${IMG}1503454537195-1dcabb73ffb9${q}600`,
        `${IMG}1595475884562-073c30d45670${q}600`,
      ],
    },
    team: {
      title: "הצוות",
      subtitle: "מי מטפלת בך",
      description: "כל אחת עם ההתמחות שלה — צבע, תלתלים או אירועים. בוחרים מעצבת בקביעת התור.",
    },
    whyChooseUs: {
      title: "למה אצלנו",
      subtitle: "בקצרה",
      mainImage: `${IMG}1521590832167-7bcbfaa6381f${q}1000`,
      badge: "ייעוץ\nלפני צבע",
      benefits: [
        { iconName: "MessageCircle", title: "ייעוץ לפני, לא הפתעה אחרי", desc: "שולחים תמונה בוואטסאפ ומקבלים הצעת מחיר לפני שיושבים בכיסא." },
        { iconName: "Palette", title: "מחירון גלוי", desc: "טווח מחירים לכל שירות, ומה נסגר רק אחרי אבחון." },
        { iconName: "Clock", title: "בזמן", desc: "תור אונליין, תזכורת יום לפני, ואפס המתנה בכניסה." },
        { iconName: "Sparkles", title: "שיער בריא קודם", desc: "הבהרות והחלקות רק אם השיער יכול לעמוד בזה." },
      ],
    },
    testimonials: {
      title: "ביקורות",
      subtitle: "מה אומרות עלינו",
    },
    gallery: {
      title: "מהכיסא שלנו",
      subtitle: "עבודות",
    },
    location: {
      title: "הסטודיו",
      subtitle: "איפה אנחנו",
    },
    contact: {
      title: "צרו קשר",
      subtitle: "לקבוע תור או לשאול",
      description: "תור אונליין לשירותים במחיר קבוע; לצבע מורכב, החלקה או כלה — שלחו תמונה בוואטסאפ ונחזור עם הצעה.",
    },
    booking: {
      title: "קביעת תור",
      tagline: "תספורת, צבע ופן",
      steps: {
        service: "שירות",
        staff: "מעצבת",
        datetime: "מועד",
        details: "פרטים",
        payment: "תשלום",
      },
      aiConsultant: {
        title: "לא בטוחה מה לבחור?",
        subtitle: "ייעוץ מהיר",
        description: "ספרי לנו על השיער שלך ומה את רוצה, ונציע את השירות המתאים.",
        agentLabel: "ייעוץ",
        placeholder: "לדוגמה: שיער ארוך צבוע, רוצה להבהיר בלי לפגוע בו...",
      },
      success: {
        title: "נקבע",
        confirmed: "התור נקבע!",
        requestSaved: "הבקשה נשמרה!",
        cancelled: "בוטל",
      },
    },
    instagram: {
      title: "עוקבים אחרי העבודות",
      handle: "",
      url: "",
      images: [
        `${IMG}1470259078422-826894b933aa?w=400&h=400&fit=crop`,
        `${IMG}1492106087820-71f1a00d2b11?w=400&h=400&fit=crop`,
        `${IMG}1519699047748-de8e457a634e?w=400&h=400&fit=crop`,
        `${IMG}1616683693504-3ea7e9ad6fec?w=400&h=400&fit=crop`,
        `${IMG}1580618672591-eb180b1a973f?w=400&h=400&fit=crop`,
        `${IMG}1600948836101-f9ffda59d250?w=400&h=400&fit=crop`,
      ],
    },
    admin: {
      staff: {
        title: "צוות",
        scheduleTitle: "זמינות שבועית",
        commitButton: "שמירת לוח זמנים",
        enforcementTitle: "אכיפת זמינות",
        enforcementDesc: "לוחות הזמנים נאכפים בזמן אמת: שינוי זמינות או חסימת יום נכנסים לתוקף מיד ומונעים כפילויות בתורים.",
      },
    },
    faq: {
      title: "שאלות נפוצות",
      subtitle: "לפני שקובעים",
      items: [
        { question: "כמה זמן לוקח כל שירות?", answer: "תספורת 45–60 דקות; פן 30–45; צבע שורש 60–90; צבע מלא עד שעתיים; גוונים ובליאז׳ 2.5–3.5 שעות; החלקה 3–5 שעות לפי אורך ומצב השיער; תסרוקת לאירוע 45–90 דקות." },
        { question: "איך מבטלים או מזיזים תור?", answer: "בקישור שבאישור התור, בוואטסאפ או בטלפון — עד 24 שעות לפני התור ללא עלות. ביטול מאוחר או אי־הגעה עשויים לחייב 50% מעלות השירות." },
        { question: "איך משלמים?", answer: "מזומן, אשראי או ביט בסלון. להחלקה, בליאז׳ מלא ותסרוקת כלה נבקש מקדמה בעת התיאום." },
        { question: "למה גוונים והחלקה בלי מחיר סופי?", answer: "כי המחיר תלוי באורך, בצפיפות ובמצב השיער (צבוע? מוחלק?). שלחי תמונה של השיער באור יום בוואטסאפ ונחזור עם הצעה — או קבעי ייעוץ של 10–15 דקות." },
        { question: "מספרים ילדים?", answer: "כן, עד גיל 12. מומלץ לקבוע לשעות הבוקר, כשהסלון שקט." },
        { question: "יש מישהי שמתמחה בתלתלים?", answer: "כן — מאיה. אפשר לבחור אותה בקביעת התור, ולהגיע עם השיער כמו שהוא ביום־יום." },
      ],
    },
  },
};
