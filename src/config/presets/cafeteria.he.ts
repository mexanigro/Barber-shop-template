import type { NichePreset } from "../../types";
import { presetThemeCafeteria } from "./themes";

export const cafeteriaPresetHe: NichePreset = {
  businessMode: "team",
  business: {
    type: "cafeteria",
    legalName: "Aroma Vivo Coffee LLC",
    address: "Av. del Libertador 2840, Palermo, Buenos Aires, Argentina",
    cancellationPolicy: "24 שעות לפני המועד",
  },

  brand: {
    name: "Aroma Vivo",
    tagline: "קפה מיוחד קלוי במנות קטנות",
    description: "קפה מיוחד קלוי בקפידה. כל כוס היא טקס של טעם ואומנות.",
    logoIconName: "Coffee",
    faviconEmoji: "☕",
    aiPersona: "אתה בריסטה וירטואלי ומומחה קפה. עזור ללקוחות לגלות את התפריט שלנו, ללמוד על תהליך הקלייה, ולמצוא את המשקה המושלם לטעמם. תמיד להיות חם ובקיא.",
  },

  theme: presetThemeCafeteria,

  hero: {
    titlePrefix: "ארומה",
    titleHighlight: "ויוו",
    titleSuffix: "קפה ייחודי · קלייה אומנותית",
    subtitle: "כל כוס מספרת סיפור. תנו לקפה לדבר לפני הלגימה הראשונה.",
    ctaPrimary: "גלו את התפריט",
    ctaSecondary: "התהליך שלנו",
    backgroundImage: "https://images.unsplash.com/photo-1445116572660-236099ec97a0?auto=format&fit=crop&q=80&w=2000",
  },

  contact: {
    address: {
      street: "שד. רוטשילד 42",
      district: "תל אביב",
      cityStateZip: "תל אביב, ישראל",
    },
    phone: "+972-3-555-1234",
    email: "hello@aromavivo.co.il",
    social: {
      instagram: "https://instagram.com/aromavivocafe",
      facebook: "https://facebook.com/aromavivocafe",
    },
  },

  hours: {
    monday: { start: "07:00", end: "20:00" },
    tuesday: { start: "07:00", end: "20:00" },
    wednesday: { start: "07:00", end: "20:00" },
    thursday: { start: "07:00", end: "20:00" },
    friday: { start: "07:00", end: "15:00" },
    saturday: null,
    sunday: { start: "07:00", end: "20:00" },
  },

  services: [
    { id: "espresso", name: "אספרסו קלאסי", subtitle: "הנשמה הטהורה", description: "אינטנסיבי, קרמי ומלא גוף. שוט כפול שחושף את מלוא אופי הפולים.", duration: 0, price: 0, category: "hot", image: "/images/menu/espresso.jpg" },
    { id: "cappuccino", name: "קפוצ'ינו רך", subtitle: "ענן קצף", description: "קצף משי מעל אספרסו כפול, עם בועיות שנמסות על החיך.", duration: 0, price: 0, category: "hot", image: "/images/menu/cappuccino.jpg" },
    { id: "flat-white", name: "פלט וויט", subtitle: "משי נוזלי", description: "מיקרופום מושלם מעל ריסטרטו כפול. מועדף בקרב חובבי קפה.", duration: 0, price: 0, category: "hot", image: "/images/menu/flatwhite.jpg" },
    { id: "cold-brew", name: "קולד ברו", subtitle: "סבלנות קרה", description: "חליטה קרה של 12 שעות. חלק, מתוק ורענן.", duration: 0, price: 0, category: "cold", image: "/images/menu/coldbrew.jpg" },
    { id: "iced-latte", name: "אייס לאטה", subtitle: "קרח ותשוקה", description: "חלב קרמי ואספרסו מאוזן על קרח. מרענן לחלוטין.", duration: 0, price: 0, category: "cold", image: "/images/menu/icedlatte.jpg" },
    { id: "frappe-moka", name: "פרפה מוקה", subtitle: "פינוק מתוק", description: "קפה, שוקולד וקצפת מעורבבים למשקה בסגנון קינוח.", duration: 0, price: 0, category: "cold", image: "/images/menu/frappemoka.jpg" },
    { id: "tiramisu", name: "טירמיסו ביתי", subtitle: "שכבות של שמחה", description: "שכבות קפה, מסקרפונה וקקאו. מתכון משפחתי מושלם.", duration: 0, price: 0, category: "desserts", image: "/images/menu/tiramisu.jpg" },
    { id: "cheesecake", name: "עוגת גבינה קרמל", subtitle: "איזון מתוק", description: "בסיס ביסקוויט, גבינת שמנת ורוטב קרמל מלוח.", duration: 0, price: 0, category: "desserts", image: "/images/menu/cheesecake.jpg" },
  ],

  staff: [
    { id: "lucas", slug: "lucas-fernandez", name: "לוקאס פרננדז", specialty: "בריסטה ראשי ומייסד", bio: "אלוף לאטה ארט לאומי לשעבר עם 10 שנות ניסיון בקפה מיוחד.", photoUrl: "https://images.unsplash.com/photo-1577219491135-ce391730fb2c?auto=format&fit=crop&q=80&w=800", portfolio: [], schedule: { monday: { isOpen: true, hours: { start: "07:00", end: "20:00" }, breaks: [] }, tuesday: { isOpen: true, hours: { start: "07:00", end: "20:00" }, breaks: [] }, wednesday: { isOpen: true, hours: { start: "07:00", end: "20:00" }, breaks: [] }, thursday: { isOpen: true, hours: { start: "07:00", end: "20:00" }, breaks: [] }, friday: { isOpen: true, hours: { start: "07:00", end: "15:00" }, breaks: [] }, saturday: { isOpen: false, hours: { start: "09:00", end: "18:00" }, breaks: [] }, sunday: { isOpen: true, hours: { start: "07:00", end: "20:00" }, breaks: [] } } },
    { id: "martina", slug: "martina-lopez", name: "מרטינה לופז", specialty: "בריסטה בכירה", bio: "מומחית חליטה וקולד ברו עם חיך מאומן.", photoUrl: "https://images.unsplash.com/photo-1554151228-14d9def656e4?auto=format&fit=crop&q=80&w=800", portfolio: [], schedule: { monday: { isOpen: true, hours: { start: "07:00", end: "20:00" }, breaks: [] }, tuesday: { isOpen: true, hours: { start: "07:00", end: "20:00" }, breaks: [] }, wednesday: { isOpen: true, hours: { start: "07:00", end: "20:00" }, breaks: [] }, thursday: { isOpen: true, hours: { start: "07:00", end: "20:00" }, breaks: [] }, friday: { isOpen: true, hours: { start: "07:00", end: "15:00" }, breaks: [] }, saturday: { isOpen: false, hours: { start: "09:00", end: "18:00" }, breaks: [] }, sunday: { isOpen: true, hours: { start: "07:00", end: "20:00" }, breaks: [] } } },
    { id: "santiago", slug: "santiago-ruiz", name: "סנטיאגו רואיס", specialty: "קלי", bio: "אומן אש איטית שמתייחס לכל פרופיל קלייה כיצירת אמנות.", photoUrl: "https://images.unsplash.com/photo-1600565193348-f74bd3c7ccdf?auto=format&fit=crop&q=80&w=800", portfolio: [], schedule: { monday: { isOpen: true, hours: { start: "07:00", end: "20:00" }, breaks: [] }, tuesday: { isOpen: true, hours: { start: "07:00", end: "20:00" }, breaks: [] }, wednesday: { isOpen: true, hours: { start: "07:00", end: "20:00" }, breaks: [] }, thursday: { isOpen: true, hours: { start: "07:00", end: "20:00" }, breaks: [] }, friday: { isOpen: true, hours: { start: "07:00", end: "15:00" }, breaks: [] }, saturday: { isOpen: false, hours: { start: "09:00", end: "18:00" }, breaks: [] }, sunday: { isOpen: true, hours: { start: "07:00", end: "20:00" }, breaks: [] } } },
  ],

  testimonials: [
    { name: "ולנטינה ר.", title: "לקוחה קבועה", text: "האספרסו הכי טוב שטעמתי. אפשר להרגיש שהם בוחרים פולים בקפידה ומחלצים בצורה מושלמת.", rating: 5 },
    { name: "מרטין ל.", title: "לקוח בוקר", text: "אני מגיע כל בוקר לפני העבודה. הפלט וויט הוא הדת שלי. האווירה גורמת לך לרצות להישאר כל היום.", rating: 5 },
    { name: "כמילה ס.", title: "מבקרת סוף שבוע", text: "בן הזוג שלי הביא אותי לקולד ברו ועכשיו אנחנו לקוחות קבועים. הטירמיסו ברמה אחרת.", rating: 5 },
    { name: "אנדרס פ.", title: "עובד מרחוק", text: "אני עובד מרחוק וזה המקום שלי. ווייפי מהיר, שקעים, קפה מעולה ואווירה רגועה.", rating: 5 },
    { name: "סופיה מ.", title: "לקוחה חדשה", text: "גיליתי את ארומה ויבו בגוגל מפות והתמונות לא משקרות. איכות הקפה והשירות עולים על הציפיות.", rating: 5 },
  ],

  gallery: [
    "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&q=80&w=800",
    "https://images.unsplash.com/photo-1442512595331-e89e73853f31?auto=format&fit=crop&q=80&w=800",
    "https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&q=80&w=800",
    "https://images.unsplash.com/photo-1498804103079-a6351b050096?auto=format&fit=crop&q=80&w=800",
  ],

  sections: {
    services: { title: "התפריט שלנו", subtitle: "יצירות ייחודיות מעוצבות בקפידה", images: [] },
    team: { title: "מי אנחנו", subtitle: "ידיים שיוצרות קסם", description: "אומנים נלהבים המסורים לאומנות הקפה המיוחד." },
    whyChooseUs: {
      title: "מה מייחד אותנו",
      subtitle: "מה הופך כל כוס למיוחדת",
      benefits: [
        { title: "פולים ממקור יחיד", desc: "אנו מקורים מחוות מובילות בקולומביה, אתיופיה וברזיל.", iconName: "Leaf" },
        { title: "קלייה במנות קטנות", desc: "כל מנה נקלית ביד להפקת טעם מקסימלית.", iconName: "Flame" },
        { title: "בריסטות מומחים", desc: "חיכים מאומנים שמכיילים כל חליטה לשלמות.", iconName: "Award" },
        { title: "אווירה רגועה", desc: "מעוצב כך שכל ביקור מרגיש כמו הפסקה מכוונת.", iconName: "Sun" },
      ],
      mainImage: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&q=80&w=800",
      badge: "קפה מיוחד",
    },
    testimonials: { title: "מה אומרים עלינו", subtitle: "4.9 בגוגל מפות" },
    gallery: { title: "המרחב שלנו", subtitle: "מקלט לחושים שלך" },
    location: { title: "בקרו אותנו", subtitle: "אנחנו מוכנים עם הכוס שלכם" },
    contact: { title: "צרו קשר", subtitle: "נשמח לשמוע מכם", description: "שאלה על התפריט, אירועים או קפה סיטונאי? כתבו לנו." },
    booking: {
      title: "הזמנת שולחן",
      tagline: "לקבוצות ואירועים מיוחדים",
      steps: { service: "סוג אירוע", staff: "מארח", datetime: "תאריך ושעה", details: "הפרטים שלך", payment: "אישור" },
      aiConsultant: { title: "מדריך קפה", subtitle: "לא בטוחים מה להזמין?", description: "הבריסטה AI שלנו ימליץ על המשקה המושלם עבורכם.", agentLabel: "בריסטה AI", placeholder: "איזה סוג קפה אתם אוהבים?" },
      success: { title: "ההזמנה אושרה", confirmed: "השולחן יהיה מוכן!", requestSaved: "הבקשה שלך נשמרה.", cancelled: "ההזמנה בוטלה." },
    },
    admin: { staff: { title: "ניהול צוות", scheduleTitle: "לוחות זמנים", commitButton: "שמור שינויים", enforcementTitle: "כללי משמרות", enforcementDesc: "הגדרת זמינות הצוות." } },
    philosophy: {
      title: "המהות שלנו",
      subtitle: "יותר מכוס, טקס",
      intro: "אנחנו מאמינים שקפה הוא טקס שמגיע לו זמן, תשומת לב וכבוד. מהפול ועד לכוס, כל שלב הוא החלטה מודעת לקראת מצוינות.",
      pillars: [
        { number: "01", title: "מקור", description: "אנו בוחרים פולים מחוות בר-קיימא בגובה ואקלים אידיאליים לפרופילי טעם ייחודיים." },
        { number: "02", title: "קלייה", description: "כל מנה נקלית ביד במנות קטנות, תוך שמירה על אופי כל מקור ללא קיצורי דרך." },
        { number: "03", title: "חליטה", description: "הבריסטות שלנו מאזנים מתיקות, חומציות וגוף כדי ללכוד את הביטוי הטוב ביותר של כל פול." },
      ],
    },
    process: {
      title: "מהחווה לכוס",
      subtitle: "תהליך מודע",
      intro: "זה יותר מקפה. זוהי שרשרת החלטות מכוונות שמכבדות את הפול, החקלאי והאדם השותה.",
      steps: [
        { number: "01", title: "בחירה", description: "אנו בוחרים פולים מחוות מובילות בקולומביה, אתיופיה וברזיל. רק 1% העליון עובר את המסנן שלנו." },
        { number: "02", title: "קלייה אומנותית", description: "כל מנה נקלית ביד תוך ניטור טמפרטורה וזמן בדייקנות." },
        { number: "03", title: "מנוחה מבוקרת", description: "הפולים נחים 48 שעות בחדר מבוקר אקלים כדי שהשמנים יתייצבו והטעמים יתרכזו." },
        { number: "04", title: "חליטה מושלמת", description: "הבריסטות שלנו מכיילים טמפרטורה, טחינה ולחץ לחליטה המיטבית מכל מקור." },
      ],
    },
    ambience: {
      title: "המרחב",
      subtitle: "מקלט לחושים שלך",
      intro: "מעוצב כך שכל ביקור מרגיש כמו הפסקה מכוונת — מהרגע שחוצים את הסף, הקצב משתנה.",
      sectors: [
        { label: "האולם הראשי", body: "אור מהרצפה עד התקרה שוטף שולחנות אלון בהירים. שום דבר לא מתחרה בארומה מהבר.", imageSrc: "https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&q=80&w=800" },
        { label: "בר הקפה", body: "בר הקפה יושב במרכז — לא כמחסום, אלא כבמה. צפו בשקילה, טחינה ומזיגה ללא לחץ.", imageSrc: "https://images.unsplash.com/photo-1453614512568-c4024d13c247?auto=format&fit=crop&q=80&w=800" },
        { label: "פינות שקטות", body: "סביב ההיקף, פינות מוצנעות עם מנורות חמות מקבלות לפטופים, מחברות או שיחה שקטה.", imageSrc: "https://images.unsplash.com/photo-1521017432531-fbd92d768814?auto=format&fit=crop&q=80&w=800" },
      ],
    },
    menu: {
      title: "התפריט שלנו",
      subtitle: "יצירות ייחודיות מעוצבות בקפידה",
      categories: [
        { key: "all", label: "הכל" },
        { key: "hot", label: "חם" },
        { key: "cold", label: "קר" },
        { key: "desserts", label: "קינוחים" },
      ],
      items: [
        { id: "espresso", name: "אספרסו קלאסי", subtitle: "הנשמה הטהורה", description: "אינטנסיבי, קרמי ומלא גוף. שוט כפול שחושף את מלוא אופי הפולים.", category: "hot", image: "https://images.unsplash.com/photo-1510707577719-ae7c14805e3a?auto=format&fit=crop&q=80&w=600" },
        { id: "cappuccino", name: "קפוצ'ינו רך", subtitle: "ענן קצף", description: "קצף משי מעל אספרסו כפול, עם בועיות שנמסות על החיך.", category: "hot", image: "https://images.unsplash.com/photo-1572442388796-11668a67e53d?auto=format&fit=crop&q=80&w=600" },
        { id: "flat-white", name: "פלט וויט", subtitle: "משי נוזלי", description: "מיקרופום מושלם מעל ריסטרטו כפול. מועדף בקרב חובבי קפה.", category: "hot", image: "https://images.unsplash.com/photo-1577968897966-3d4325b36b61?auto=format&fit=crop&q=80&w=600" },
        { id: "cold-brew", name: "קולד ברו", subtitle: "סבלנות קרה", description: "חליטה קרה של 12 שעות. חלק, מתוק ורענן.", category: "cold", image: "https://images.unsplash.com/photo-1461023058943-07fcbe16d735?auto=format&fit=crop&q=80&w=600" },
        { id: "iced-latte", name: "אייס לאטה", subtitle: "קרח ותשוקה", description: "חלב קרמי ואספרסו מאוזן על קרח. מרענן לחלוטין.", category: "cold", image: "https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?auto=format&fit=crop&q=80&w=600" },
        { id: "frappe-moka", name: "פרפה מוקה", subtitle: "פינוק מתוק", description: "קפה, שוקולד וקצפת מעורבבים למשקה בסגנון קינוח.", category: "cold", image: "https://images.unsplash.com/photo-1579888944880-d98341245702?auto=format&fit=crop&q=80&w=600" },
        { id: "tiramisu", name: "טירמיסו ביתי", subtitle: "שכבות של שמחה", description: "שכבות קפה, מסקרפונה וקקאו. מתכון משפחתי מושלם.", category: "desserts", image: "https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?auto=format&fit=crop&q=80&w=600" },
        { id: "cheesecake", name: "עוגת גבינה קרמל", subtitle: "איזון מתוק", description: "בסיס ביסקוויט, גבינת שמנת ורוטב קרמל מלוח.", category: "desserts", image: "https://images.unsplash.com/photo-1533134242443-d4fd215305ad?auto=format&fit=crop&q=80&w=600" },
      ],
    },
    faq: {
      title: "שאלות נפוצות",
      subtitle: "טוב לדעת לפני הביקור",
      items: [
        { question: "אפשר לשריין מקום?", answer: "אנחנו עובדים לפי סדר הגעה. לקבוצות של 6+ אנא התקשרו מראש." },
        { question: "יש אפשרויות טבעוניות/ללא גלוטן?", answer: "כן! יש לנו אפשרויות מסומנות לטבעונים, צמחונים וללא גלוטן." },
        { question: "יש Wi-Fi?", answer: "Wi-Fi מהיר וחינמי זמין לכל האורחים. בקשו מהצוות את הסיסמה." },
        { question: "אפשר להביא לפטופ ולעבוד?", answer: "בהחלט! יש לנו שקעים ופינה שקטה למי שעובד מרחוק." },
      ],
    },
  },
};
