import type { NichePreset } from "../../types";
import { presetThemeRemodelaciones } from "./themes";

export const remodelacionesPresetHe: NichePreset = {
  businessMode: "team",
  business: {
    type: "remodelaciones",
    legalName: "BrushCraft Painting Pty Ltd",
    address: "Sydney, NSW, Australia",
    cancellationPolicy: "48 שעות לפני מועד ההתחלה",
  },

  brand: {
    name: "BrushCraft",
    tagline: "צביעת בתים מקצועית בכל סידני",
    description: "שירותי צביעה פנימית וחיצונית מקצועיים. בעלי רישיון, מבוטחים ומגובים באחריות איכות.",
    logoIconName: "Paintbrush",
    faviconEmoji: "🏠",
    aiPersona: "אתה יועץ וירטואלי לחברת צביעה מקצועית. עזור ללקוחות להבין את השירותים שלנו, לקבל הצעות מחיר וללמוד על התהליך שלנו. היה מקצועי, בקיא ועוזר.",
  },

  theme: presetThemeRemodelaciones,

  hero: {
    titlePrefix: "אנחנו משנים",
    titleHighlight: "את הבית שלך",
    titleSuffix: "עם גימור מושלם",
    subtitle: "צביעה פנימית וחיצונית לבתים ועסקים. בעלי רישיון, מבוטחים ומגובים באחריות איכות.",
    ctaPrimary: "הצעת מחיר חינם",
    ctaSecondary: "ראו את העבודות שלנו",
    backgroundImage: "https://images.unsplash.com/photo-1774977737078-7ccc2ac697e6?auto=format&fit=crop&q=80&w=2000",
    variant: "slider",
    beforeImage: "https://images.unsplash.com/photo-1556909114-44e3e70034e2?auto=format&fit=crop&q=80&w=1600",
    afterImage: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&q=80&w=1600",
    stats: [
      { value: "500+", label: "בתים נצבעו" },
      { value: "15+", label: "שנות ניסיון" },
      { value: "100%", label: "שביעות רצון" },
    ],
  },

  contact: {
    address: {
      street: "רח' הצבעים 42",
      district: "מרכז",
      cityStateZip: "תל אביב, ישראל",
    },
    phone: "+972-50-555-1234",
    email: "hello@brushcraft.co.il",
    social: {
      instagram: "https://instagram.com/brushcraftpainting",
      facebook: "https://facebook.com/brushcraftpainting",
    },
  },

  hours: {
    monday: { start: "07:00", end: "17:00" },
    tuesday: { start: "07:00", end: "17:00" },
    wednesday: { start: "07:00", end: "17:00" },
    thursday: { start: "07:00", end: "17:00" },
    friday: { start: "07:00", end: "14:00" },
    saturday: null,
    sunday: { start: "07:00", end: "17:00" },
  },

  services: [
    { id: "consultation", name: "ייעוץ חינם", description: "אנו מבקרים בנכס שלך, דנים בצבעים ומספקים הצעת מחיר מפורטת. ללא התחייבות.", duration: 60, price: 0, fromPrice: "חינם", popular: true, features: ["ייעוץ צבעים באתר", "הצעת מחיר תוך 24 שעות", "ללא התחייבות", "ייעוץ מומחה בצבעים וגימורים"] },
    { id: "interior", name: "צביעה פנימית", description: "צביעה פנימית מלאה כולל קירות, תקרות, פנלים וקירות אקצנט עם צבעים פרימיום.", duration: 0, price: 1200, fromPrice: "מ-₪4,500", features: ["קירות ותקרות", "פנלים ומסגרות", "קירות אקצנט", "ייעוץ צבעים כלול"] },
    { id: "exterior", name: "צביעה חיצונית", description: "צביעה חיצונית מלאה עם ציפויים עמידים למזג אוויר להגנה מתמשכת.", duration: 0, price: 2500, fromPrice: "מ-₪8,000", features: ["קירות חיצוניים", "מרזבים ומסגרות", "חלונות ודלתות", "ציפוי עמיד למזג אוויר"] },
    { id: "deck-fence", name: "צביעת דק וגדר", description: "צביעת דק עץ וגדרות עם הגנה מפני UV ומזג אוויר.", duration: 0, price: 800, fromPrice: "מ-₪3,000", features: ["צביעת דק עץ", "צביעת גדרות", "שטיפה בלחץ כלולה", "הגנת UV ומזג אוויר"] },
  ],

  staff: [
    { id: "lead-painter", slug: "lead-painter", name: "צבע ראשי", specialty: "מנהל פרויקטים", bio: "15+ שנות ניסיון בצביעה למגורים ומסחר.", photoUrl: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&q=80&w=800", portfolio: [], schedule: { monday: { isOpen: true, hours: { start: "07:00", end: "17:00" }, breaks: [] }, tuesday: { isOpen: true, hours: { start: "07:00", end: "17:00" }, breaks: [] }, wednesday: { isOpen: true, hours: { start: "07:00", end: "17:00" }, breaks: [] }, thursday: { isOpen: true, hours: { start: "07:00", end: "17:00" }, breaks: [] }, friday: { isOpen: true, hours: { start: "07:00", end: "14:00" }, breaks: [] }, saturday: { isOpen: false, hours: { start: "08:00", end: "13:00" }, breaks: [] }, sunday: { isOpen: true, hours: { start: "07:00", end: "17:00" }, breaks: [] } } },
  ],

  testimonials: [
    { name: "שרה מ.", title: "בעלת בית, רמת גן", text: "עבודה מבריקה לחלוטין על החיצוני שלנו. הצוות היה דייקן, נקי והגימור מושלם. ממליצה בחום!", rating: 5 },
    { name: "יעקב ו.", title: "בעל בית, כפר סבא", text: "צבעו את כל הפנים שלנו בארבעה ימים ללא בעיות. מקצועיים, מהירים וייעוץ צבעים מעולה.", rating: 5 },
    { name: "לינדה ט.", title: "מנהלת נכסים, הרצליה", text: "אנו משתמשים ב-BrushCraft לכל הצביעות המחודשות שלנו. אמינים, במחיר הוגן, והדיירים תמיד אוהבים את התוצאות.", rating: 5 },
  ],

  gallery: [
    "https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?auto=format&fit=crop&q=80&w=800",
    "https://images.unsplash.com/photo-1600573472591-ee6b68d14c68?auto=format&fit=crop&q=80&w=800",
    "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&q=80&w=800",
    "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&q=80&w=800",
  ],

  sections: {
    services: { title: "השירותים שלנו", subtitle: "פתרונות צביעה מקצועיים לכל פרויקט", images: ["https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&q=80&w=800", "https://images.unsplash.com/photo-1556909172-54557c7e4fb7?auto=format&fit=crop&q=80&w=800", "https://images.unsplash.com/photo-1778342259272-142fa3f81859?auto=format&fit=crop&q=80&w=800", "https://images.unsplash.com/photo-1600585154363-67eb9e2e2099?auto=format&fit=crop&q=80&w=800"] },
    team: { title: "הצוות שלנו", subtitle: "צבעים בעלי רישיון וניסיון", description: "צוות הצבעים המיומנים שלנו מביא שנות ניסיון ותשומת לב לפרטים לכל פרויקט." },
    whyChooseUs: {
      title: "למה לבחור בנו",
      subtitle: "איכות שאפשר לסמוך עליה",
      benefits: [
        { title: "בעלי רישיון ומבוטחים", desc: "רישיון מלא וביטוח לשלוות הנפש שלך.", iconName: "Shield" },
        { title: "צבעים פרימיום", desc: "אנו משתמשים רק בצבעי פרימיום בכל עבודה.", iconName: "Droplets" },
        { title: "הכנה קפדנית", desc: "מילוי, שיוף, יסוד — הכנה נכונה לגימור מתמשך.", iconName: "Hammer" },
        { title: "בזמן ובתקציב", desc: "אנו מכבדים את הלוח שלך ומספקים כפי שהוצע.", iconName: "Clock" },
        { title: "אתר נקי", desc: "אנו מתייחסים לנכס שלך כמו שלנו — נקיון כל יום.", iconName: "Sparkles" },
        { title: "אחריות איכות", desc: "אחריות עבודה בכתב על כל עבודותינו.", iconName: "Award" },
      ],
      mainImage: "https://images.unsplash.com/photo-1600585154526-990dced4db0d?auto=format&fit=crop&q=80&w=800",
      badge: "צבעים מורשים",
    },
    testimonials: { title: "מה הלקוחות אומרים", subtitle: "5.0 בביקורות גוגל" },
    gallery: { title: "העבודות שלנו", subtitle: "שינויים לפני ואחרי" },
    location: { title: "אזור שירות", subtitle: "כל אזור המרכז והשרון" },
    contact: { title: "קבלו הצעת מחיר", subtitle: "הערכות חינם ללא התחייבות", description: "ספרו לנו על הפרויקט שלכם ונספק הצעת מחיר מפורטת תוך 24 שעות." },
    booking: {
      title: "קבעו ייעוץ",
      tagline: "ייעוץ צבעים חינם באתר",
      steps: { service: "סוג שירות", staff: "יועץ", datetime: "תאריך מועדף", details: "הפרטים שלך", payment: "אישור" },
      aiConsultant: { title: "יועץ פרויקטים", subtitle: "לא בטוחים מה צריכים?", description: "היועץ AI שלנו יעזור לכם להבין אילו שירותים מתאימים לפרויקט שלכם.", agentLabel: "יועץ AI", placeholder: "תארו את פרויקט הצביעה שלכם..." },
      success: { title: "הייעוץ נקבע", confirmed: "ניצור קשר לאשר!", requestSaved: "הבקשה שלך נשמרה.", cancelled: "ההזמנה בוטלה." },
    },
    admin: { staff: { title: "ניהול צוות", scheduleTitle: "לוחות זמנים", commitButton: "שמור שינויים", enforcementTitle: "זמינות", enforcementDesc: "הגדרת זמינות הצוות." } },
    process: {
      title: "איך אנחנו עובדים",
      subtitle: "התהליך המוכח שלנו בארבעה שלבים",
      steps: [
        { number: "01", title: "ייעוץ חינם", description: "אנו מבקרים בנכס, דנים בצבעים ומספקים הצעת מחיר מפורטת בכתב. ללא התחייבות.", iconName: "MessageCircle" },
        { number: "02", title: "הכנה והגנה", description: "מסכה, שיוף, מילוי סדקים ויסוד משטחים כדי שהצבע יידבק בצורה מושלמת.", iconName: "ClipboardList" },
        { number: "03", title: "צביעה ושינוי", description: "הצבעים המנוסים שלנו מורחים צבעי פרימיום בדייקנות: קווים נקיים, כיסוי אחיד.", iconName: "Paintbrush" },
        { number: "04", title: "סיור סופי", description: "אנו בודקים כל פרט איתך ועוזבים רק כשאתם מרוצים ב-100%.", iconName: "CheckCircle" },
      ],
    },
    portfolio: {
      title: "הפרויקטים שלנו",
      subtitle: "שינויים אחרונים באזור",
      filters: [
        { key: "all", label: "הכל" },
        { key: "interior", label: "פנימי" },
        { key: "exterior", label: "חיצוני" },
      ],
      projects: [
        {
          title: "בית עץ, הרצליה", type: "צביעה חיצונית", description: "צביעה חיצונית מלאה של בית עץ קלאסי. הסרת צבע מתקלף, מילוי סדקים ושתי שכבות צבע עמיד.", duration: "5 ימים", size: "220 מ\"ר", filter: "exterior",
          images: ["https://images.unsplash.com/photo-1568605114967-8130f3a36994?auto=format&fit=crop&q=80&w=800"],
          gallery: [
            { before: "https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?auto=format&fit=crop&q=80&w=600", after: "https://images.unsplash.com/photo-1568605114967-8130f3a36994?auto=format&fit=crop&q=80&w=600", caption: "חזית הבית" },
            { before: "https://images.unsplash.com/photo-1459767129954-1b1c1f9b9ace?auto=format&fit=crop&q=80&w=600", after: "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&q=80&w=600", caption: "צד הבניין" },
          ],
        },
        {
          title: "דירה, רמת גן", type: "חידוש פנימי", description: "צביעה פנימית מלאה: קירות, תקרות, פנלים ומסגרות דלתות בפלטה ניטרלית מודרנית.", duration: "4 ימים", size: "150 מ\"ר", filter: "interior",
          images: ["https://images.unsplash.com/photo-1600210492493-0946911123ea?auto=format&fit=crop&q=80&w=800"],
          gallery: [
            { before: "https://images.unsplash.com/photo-1556909114-44e3e70034e2?auto=format&fit=crop&q=80&w=600", after: "https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?auto=format&fit=crop&q=80&w=600", caption: "סלון" },
            { before: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&q=80&w=600", after: "https://images.unsplash.com/photo-1600566752355-35792bedcfea?auto=format&fit=crop&q=80&w=600", caption: "מטבח" },
          ],
        },
        {
          title: "בית משפחה, כפר סבא", type: "חיצוני מלא", description: "בית דו-קומתי גדול. שטיפה בלחץ, איטום סדקים וצביעה בפלטת אפור מודרנית עם לבן.", duration: "6 ימים", size: "310 מ\"ר", filter: "exterior",
          images: ["https://images.unsplash.com/photo-1777728868180-dbfc61eef59f?auto=format&fit=crop&q=80&w=800"],
          gallery: [
            { before: "https://images.unsplash.com/photo-1767022518702-5cbf807163ec?auto=format&fit=crop&q=80&w=600", after: "https://images.unsplash.com/photo-1759406066673-f76869a4e6db?auto=format&fit=crop&q=80&w=600", caption: "מבט מהרחוב" },
          ],
        },
        {
          title: "וילה חוף, נתניה", type: "חיצוני ודק", description: "צביעה חיצונית מלאה בתוספת צביעת דק עץ עם ציפויים עמידים למלח ו-UV.", duration: "7 ימים", size: "400 מ\"ר", filter: "exterior",
          images: ["https://images.unsplash.com/photo-1642369259805-8b2d772512fe?auto=format&fit=crop&q=80&w=800"],
          gallery: [
            { before: "https://images.unsplash.com/photo-1776871293001-3e44d160564b?auto=format&fit=crop&q=80&w=600", after: "https://images.unsplash.com/photo-1594468243943-c031c526dbc7?auto=format&fit=crop&q=80&w=600", caption: "חזית ודק" },
          ],
        },
      ],
    },
    faq: {
      title: "שאלות נפוצות",
      subtitle: "שאלות נפוצות לגבי השירותים שלנו",
      items: [
        { question: "כמה זמן לוקח פרויקט?", answer: "הזמנים משתנים לפי היקף. חדר בודד לוקח 3-5 ימים, שיפוץ מלא 2-6 שבועות." },
        { question: "יש הערכת מחיר חינם?", answer: "כן! אנחנו מציעים ייעוץ במקום והצעת מחיר מפורטת ללא התחייבות." },
        { question: "יש לכם רישיון וביטוח?", answer: "מורשים ומבוטחים לחלוטין. אנחנו מספקים תעודות לפי בקשה." },
        { question: "צריך לצאת מהבית בזמן השיפוץ?", answer: "ברוב הפרויקטים לא. אנחנו עובדים חלק חלק ומנקים בסוף כל יום." },
      ],
    },
  },
};
