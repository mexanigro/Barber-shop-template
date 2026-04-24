import type { NichePreset } from "../../types";
import { presetThemeNails } from "./themes";

export const nailsPresetHe: NichePreset = {
  // ─── Business & Legal ────────────────────────────────────────────────────────
  business: {
    type: "nails",
    legalName: "AURA NAIL STUDIO LLC",
    address: "רח׳ Bloom 214, דיסטריקט העיצוב, מיאמי, FL 33132, ארצות הברית",
    cancellationPolicy: "24 שעות לפני מועד התור שנקבע",
  },

  // ─── Brand ───────────────────────────────────────────────────────────────────
  brand: {
    name: "AURA NAIL STUDIO",
    tagline: "שבכל פרט יש ברק",
    description:
      "סטודיו ציפורניים יוקרתי — אמנות ציפורניים מדויקת, מערכות ג׳ל עמידות ועיצובים בהתאמה אישית. כל תור הוא חוויה פרטית ולא־מהורהרת סביב האסתטיקה שלכם.",
    logoIconName: "Sparkles",
    aiPersona:
      "אתם מומחה וירטואלי ב־Aura Nail Studio בסטודיו פרימיום במיאמי. הנחיה בחום — שאלות על שירותים, הכנה לתור, טיפול אחרי והמלצה על טכנאית וטיפול מתאימים. חמים, יודעים וממוקדי יופי.",
  },

  theme: presetThemeNails,

  // ─── Hero ─────────────────────────────────────────────────────────────────────
  hero: {
    titlePrefix: "הציפורניים שלכם,",
    titleHighlight: "האמנות שלנו",
    titleSuffix: "יופי מדויק, בכל פעם",
    subtitle:
      "כל תור מתחיל בתדריך עיצוב אישי — צורה, גימור וכיוון סגנון לפני תחילת הטיפול. אמנות ציפורניים מותאמת בדיוק מקצועי.",
    ctaPrimary: "קבעו תור",
    ctaSecondary: "לגלריה",
    // Luxury nail salon interior — soft lighting, elegant station, premium aesthetic
    backgroundImage:
      "https://images.unsplash.com/photo-1604654894610-df63bc536371?auto=format&fit=crop&q=80&w=2000",
  },

  // ─── Contact ─────────────────────────────────────────────────────────────────
  contact: {
    address: {
      street: "214 Bloom Street",
      district: "Design District",
      cityStateZip: "Miami, FL 33132",
    },
    phone: "(305) 555-0182",
    email: "hello@auranailstudio.com",
    social: {
      instagram: "https://instagram.com/auranailstudio",
      facebook: "https://facebook.com/auranailstudio",
      twitter: "https://twitter.com/auranailstudio",
    },
  },

  // ─── Business Hours ───────────────────────────────────────────────────────────
  hours: {
    monday: null,
    tuesday: { start: "10:00", end: "19:00" },
    wednesday: { start: "10:00", end: "19:00" },
    thursday: { start: "10:00", end: "19:00" },
    friday: { start: "10:00", end: "19:00" },
    saturday: { start: "10:00", end: "19:00" },
    sunday: { start: "11:00", end: "17:00" },
  },

  // ─── Services ────────────────────────────────────────────────────────────────
  // CRITICAL: services[i] maps 1:1 to sections.services.images[i].
  // If you add or reorder a service here, update sections.services.images below.
  //
  // Pricing model:
  //   services[0] Classic Manicure          → $45 flat
  //   services[1] Gel Manicure              → $65 flat
  //   services[2] Acrylic Full Set          → $85 flat
  //   services[3] Nail Art & Bespoke        → from $25/nail
  //   services[4] Luxury Spa Pedicure       → $75 flat
  //   services[5] Nail Extensions & Infills → from $55
  services: [
    {
      id: "classic-manicure",
      name: "מניקור קלאסי",
      description:
        "בסיס לציפורניים מושלמות: עיצוב ושיוף לפי צורה, טיפוח זיקית, עיסוי יד ושורש כף היד, ולכה ללא פסים. טקס מלא של 45 דקות.",
      duration: 45,
      price: 45,
    },
    {
      id: "gel-manicure",
      name: "מניקור ג׳ל",
      description:
        "צבע עמיד המאובחן ב־UV לברק מראה ועמידות עד שלושה שבועות. כולל צורה, זיקיות, טיפוח יד ובחירה מספריית הג׳ל. אידיאלי ללו״ז צפוף ונסיעות.",
      duration: 60,
      price: 65,
    },
    {
      id: "acrylic-full-set",
      name: "סט אקריל מלא",
      description:
        "הארכות אקריל מפוסלות לפי המפרט שלכם — אורך, צורה וגימור בזמן הישיבה. ארון, שקד, ריבוע או סטילטו — כל ציפורן נבנית לשלמות מבנית ואינטגרציה חלקה עם הציפורן הטבעית.",
      duration: 90,
      price: 85,
    },
    {
      id: "nail-art",
      name: "אמנות ציפורניים והתאמה אישית",
      description:
        "הפיכת הציפורניים לאמנות לבישה: מוטיבים בצבע יד, מיקרו־דיטייל, אבנים, כרום ופיסול תלת־ממדי — לפי בריף אישי. מחיר לפי ציפורן לפי מורכבות. הביאו השראה או נעצב בשבילכם.",
      duration: 60,
      price: 25,
    },
    {
      id: "spa-pedicure",
      name: "פדיקור ספא יוקרתי",
      description:
        "טקס רגליים מלא: השריה חמה במלחי מינרל, פילינג, מסכה לחה, עיסוי שוק וכף רגל, עיצוב ציפורניים וגימור ג׳ל לבחירה. 75 דקות של פינוק רצוף.",
      duration: 75,
      price: 75,
    },
    {
      id: "extensions-infills",
      name: "הארכות ומילויים",
      description:
        "תחזוקה לסט אקריל או ג׳ל קשיח עם מילוי מדויק — משחזר אורך, מתקן פערי צמיחה ומרענן גימור. כולל צורה, זיקיות וריענון צבע. זמין גם כהארכה מלאה מעל הציפורן הטבעית.",
      duration: 60,
      price: 55,
    },
  ],

  // ─── Staff ───────────────────────────────────────────────────────────────────
  staff: [
    {
      id: "sofia",
      slug: "sofia-reyes",
      name: "Sofia Reyes",
      // Portrait: professional female beauty technician, warm studio setting
      photoUrl:
        "https://images.unsplash.com/photo-1594744803329-e58b31de8bf5?auto=format&fit=crop&q=80&w=800",
      specialty: "ג׳ל ואמנות ציפורניים",
      bio: "סופיה אמנית לפני שהציפורן הפכה לקנבס. שמונה שנות ניסיון ואיור — עין חדה לפרטים. מפורסמת בעיצובים צבועים ביד, בוטניקה עדינה ודיוקנים מיניאטוריים שמופיעים בתקשורת מיאמי. כל בריף הוא שיתוף פעולה יצירתי.",
      // Portfolio: finished nail art and gel manicure results only
      portfolio: [
        "https://images.unsplash.com/photo-1604654894610-df63bc536371?auto=format&fit=crop&q=80&w=1200",
        "https://images.unsplash.com/photo-1604654894610-df63bc536371?auto=format&fit=crop&q=80&w=1200",
        "https://images.unsplash.com/photo-1519014816548-bf5fe059798b?auto=format&fit=crop&q=80&w=1200",
        "https://images.unsplash.com/photo-1519014816548-bf5fe059798b?auto=format&fit=crop&q=80&w=1200",
      ],
      social: {
        instagram: "https://instagram.com/sofiareyes.nails",
        twitter: "https://twitter.com/sofiareyes",
      },
      schedule: {
        monday: { isOpen: false, hours: { start: "00:00", end: "00:00" }, breaks: [] },
        tuesday: { isOpen: true, hours: { start: "10:00", end: "18:00" }, breaks: [{ start: "13:00", end: "14:00", label: "צהריים" }] },
        wednesday: { isOpen: true, hours: { start: "10:00", end: "18:00" }, breaks: [{ start: "13:00", end: "14:00", label: "צהריים" }] },
        thursday: { isOpen: true, hours: { start: "10:00", end: "19:00" }, breaks: [{ start: "13:00", end: "14:00", label: "צהריים" }] },
        friday: { isOpen: true, hours: { start: "10:00", end: "19:00" }, breaks: [{ start: "14:00", end: "15:00", label: "הפסקה" }] },
        saturday: { isOpen: true, hours: { start: "10:00", end: "18:00" }, breaks: [] },
        sunday: { isOpen: false, hours: { start: "00:00", end: "00:00" }, breaks: [] },
      },
    },
    {
      id: "camille",
      slug: "camille-dupont",
      name: "Camille Dupont",
      // Portrait: professional female beauty technician, elegant studio
      photoUrl:
        "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&q=80&w=800",
      specialty: "אקריל ופיסול",
      bio: "קמיל התמחתה באקדמיה מובילה בפריז לפני מיאמי — דיוק אירופי בפיסול. צורות אדריכליות — ארון ארוך, שקד מעודן, סטילטו דרמטי — אקריל חלק שנשמר שבועות. טכניקה וויזואל חדים.",
      // Portfolio: finished acrylic sets and sculpted nail results only
      portfolio: [
        "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&q=80&w=1200",
        "https://images.unsplash.com/photo-1604654894610-df63bc536371?auto=format&fit=crop&q=80&w=1200",
        "https://images.unsplash.com/photo-1519014816548-bf5fe059798b?auto=format&fit=crop&q=80&w=1200",
        "https://images.unsplash.com/photo-1519014816548-bf5fe059798b?auto=format&fit=crop&q=80&w=1200",
      ],
      social: {
        instagram: "https://instagram.com/camilledupont.nails",
        facebook: "https://facebook.com/camilledupont",
      },
      schedule: {
        monday: { isOpen: false, hours: { start: "00:00", end: "00:00" }, breaks: [] },
        tuesday: { isOpen: false, hours: { start: "00:00", end: "00:00" }, breaks: [] },
        wednesday: { isOpen: true, hours: { start: "10:00", end: "19:00" }, breaks: [{ start: "13:00", end: "14:00", label: "צהריים" }] },
        thursday: { isOpen: true, hours: { start: "10:00", end: "19:00" }, breaks: [{ start: "13:00", end: "14:00", label: "צהריים" }] },
        friday: { isOpen: true, hours: { start: "10:00", end: "19:00" }, breaks: [{ start: "14:00", end: "15:00", label: "הפסקה" }] },
        saturday: { isOpen: true, hours: { start: "10:00", end: "19:00" }, breaks: [{ start: "13:30", end: "14:30", label: "צהריים" }] },
        sunday: { isOpen: true, hours: { start: "11:00", end: "17:00" }, breaks: [] },
      },
    },
    {
      id: "yuki",
      slug: "yuki-tanaka",
      name: "Yuki Tanaka",
      // Portrait: professional female beauty technician, calm and polished aesthetic
      photoUrl:
        "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?auto=format&fit=crop&q=80&w=800",
      specialty: "קלאסי וטיפולי ספא",
      bio: "יוקי התמחתה במסורת ציפורניים ובריאות יפנית — טכניקה מוקפדת ושקט ללקוח באותה משקל. מניקור קלאסי, ג׳ל ופדיקור ספא יוקרתי כאמנות בהתאמה. הלקוחות מתארות מפגש כמרגיע כמו יפה.",
      // Portfolio: finished classic manicure and spa pedicure results only
      portfolio: [
        "https://images.unsplash.com/photo-1604654894610-df63bc536371?auto=format&fit=crop&q=80&w=1200",
        "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&q=80&w=1200",
        "https://images.unsplash.com/photo-1604654894610-df63bc536371?auto=format&fit=crop&q=80&w=1200",
        "https://images.unsplash.com/photo-1519014816548-bf5fe059798b?auto=format&fit=crop&q=80&w=1200",
      ],
      social: {
        instagram: "https://instagram.com/yukitanaka.nails",
        twitter: "https://twitter.com/yukitanaka",
      },
      schedule: {
        monday: { isOpen: false, hours: { start: "00:00", end: "00:00" }, breaks: [] },
        tuesday: { isOpen: true, hours: { start: "10:00", end: "19:00" }, breaks: [{ start: "13:00", end: "14:00", label: "צהריים" }] },
        wednesday: { isOpen: true, hours: { start: "10:00", end: "19:00" }, breaks: [{ start: "13:00", end: "14:00", label: "צהריים" }] },
        thursday: { isOpen: true, hours: { start: "10:00", end: "19:00" }, breaks: [{ start: "13:00", end: "14:00", label: "צהריים" }] },
        friday: { isOpen: true, hours: { start: "10:00", end: "19:00" }, breaks: [{ start: "14:00", end: "15:00", label: "הפסקה" }] },
        saturday: { isOpen: true, hours: { start: "10:00", end: "19:00" }, breaks: [] },
        sunday: { isOpen: true, hours: { start: "11:00", end: "17:00" }, breaks: [] },
      },
    },
  ],

  // ─── Testimonials ─────────────────────────────────────────────────────────────
  testimonials: [
    {
      name: "Alessandra Monroe",
      title: "סטייליסטית אופנה",
      text: "ביקרתי בסטודיואים ברחבי מיאמי — אין כמו Aura. סופיה ציירה פרחים ביד והלקוחות בצילום שאלו איפה עשיתי. הייעוץ לפני שינה הכול — הבינה את האסתטיקה מיד.",
      rating: 5,
    },
    {
      name: "Natalie Chen",
      title: "מעצבת פנים",
      text: "האקריל של קמיל ברמה משל עצמה. הסט ארון החזיק חמישה שבועות בלי הרמה. הסטודיו נקי והחוויה יוקרתית באמת, לא רק יקרה.",
      rating: 5,
    },
    {
      name: "Rachel Torres",
      title: "מנהלת שיווק",
      text: "הזמנתי פדיקור ספא יוקרתי עם יוקי אחרי שבוע קשה — יצאתי מרותנת. ההיגיינה ברורה מהרגע שיושבים, והטיפול היה היסודי ביותר שחוויתי. כבר קבעתי שוב.",
      rating: 5,
    },
  ],

  // ─── Gallery ─────────────────────────────────────────────────────────────────
  // 12 curated finished nail art and manicure shots.
  // Rule: NO process shots, NO bare unpolished hands. Only completed nail looks.
  gallery: [
    "https://images.unsplash.com/photo-1604654894610-df63bc536371?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1604654894610-df63bc536371?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1519014816548-bf5fe059798b?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1519014816548-bf5fe059798b?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1604654894610-df63bc536371?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1594744803329-e58b31de8bf5?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1604654894610-df63bc536371?auto=format&fit=crop&q=80&w=1200",
  ],

  // ─── Section Copy ─────────────────────────────────────────────────────────────
  sections: {
    services: {
      title: "לכה ודיוק",
      subtitle: "השירותים שלנו",
      // ACTION shots — one per service, same order as services[].
      // services[0] Classic Manicure      → technician applying polish
      // services[1] Gel Manicure          → in-session manicure detail
      // services[2] Acrylic Full Set      → sculpted extension result
      // services[3] Nail Art & Bespoke    → artistic nail detail
      // services[4] Luxury Spa Pedicure   → finished pedicure result
      // services[5] Extensions & Infills  → refined manicure finish
      images: [
        "https://images.unsplash.com/photo-1753285310651-6974a839c992?auto=format&fit=crop&q=80&w=600",
        "https://images.unsplash.com/photo-1676926606566-58f2e00b592b?auto=format&fit=crop&q=80&w=600",
        "https://images.unsplash.com/photo-1604654894610-df63bc536371?auto=format&fit=crop&q=80&w=600",
        "https://images.unsplash.com/photo-1519014816548-bf5fe059798b?auto=format&fit=crop&q=80&w=600",
        "https://images.unsplash.com/photo-1707725238063-0c54fb6963d1?auto=format&fit=crop&q=80&w=600",
        "https://images.unsplash.com/photo-1674691412909-8405f0a19940?auto=format&fit=crop&q=80&w=600",
      ],
    },
    team: {
      title: "יופי ומומחיות // v1.0",
      subtitle: "האמניות",
      description:
        "כל טכנאית ב־Aura נבחרה לא רק לשליטה טכנית אלא לטיפול ואינטליגנציה יצירתית בכל מפגש. סטודיו של מומחיות — שלוש דיסציפלינות, סטנדרט אחד של שלמות.",
    },
    whyChooseUs: {
      title: "הסטנדרט",
      subtitle: "למה לבחור בנו",
      // Elegant nail studio interior — clean stations, soft lighting, premium detail
      mainImage:
        "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&q=80&w=1000",
      badge: "8 שנים\nשל יופי",
      benefits: [
        {
          iconName: "ShieldCheck",
          title: "היגיינה ללא פשרות",
          desc: "כלים מעוקלים בין לקוחות; רכיבים חד־פעמיים נזרקים אחרי כל סשן; תחנות עבודה מחוטאות לסטנדרט קליני. הבטיחות והשקט נפשי במקום הראשון.",
        },
        {
          iconName: "Sparkles",
          title: "ייעוץ מותאם",
          desc: "לפני כל טיפול מתיישרים על כיוון סגנון, מטרות ציפורניים וגימור — כדי שהתוצאה תרגיש מכוונת, לבישה ובלעדית.",
        },
        {
          iconName: "Palette",
          title: "עיצוב באמת מותאם",
          desc: "בלי תבניות מוכנות ובלי תרשימים גנריים. כל עיצוב ב־Aura נולד בשבילכם — מצויר ומצויר ביד ולעולם לא משוכפל.",
        },
        {
          iconName: "Award",
          title: "מוצרים פרימיום בלבד",
          desc: "ג׳ל מקצועי, נוסחאות ללא HEMA ומותגים בלעדיים לסלון. בריאות הציפורניים לטווח ארוך חשובה לנו כמו הגימור היום.",
        },
      ],
    },
    testimonials: {
      title: "קולות אמון",
      subtitle: "מה אומרות הלקוחות",
    },
    gallery: {
      title: "אמנות בפרטים",
      subtitle: "תיק העבודות",
    },
    location: {
      title: "לבקר בסטודיו",
      subtitle: "איך מגיעים",
    },
    contact: {
      title: "צרו קשר",
      subtitle: "מתחילים את המסע",
      description:
        "רוצים אמנות ציפורניים מדויקת? שלחו הודעה, שתפו השראה, והצוות יחזור לתאם תור.",
    },
    booking: {
      title: "קביעת ביקור",
      tagline:
        "קבעו שירות ישירות והתאימו את המראה עם הטכנאית לפני תחילת הטיפול.",
      steps: {
        service: "שירות",
        staff: "טכנאית",
        datetime: "תזמון",
        details: "אישור",
        payment: "תשלום",
      },
      aiConsultant: {
        title: "אינטליגנציית ציפורניים",
        subtitle: "לא בטוחות מאיפה?",
        description:
          "תארו את המראה הרצוי והמומחה הווירטואלי ימליץ על שירות, טכנאית וגישה — כדי להגיע לייעוץ מוכנות.",
        agentLabel: "יועצת יופי",
        placeholder:
          "תארו מראה אידיאלי (למשל: שקד ורוד רך עם ג׳ל ופירוט זהב עדין)...",
      },
      success: {
        title: "הצלחה",
        confirmed: "אושר!",
        requestSaved: "הבקשה נשמרה!",
        cancelled: "בוטל",
      },
    },
    admin: {
      staff: {
        title: "צוות טכנאיות",
        scheduleTitle: "חלון שבועי בסטודיו",
        commitButton: "שמירת לוח זמנים",
        enforcementTitle: "אכיפת לוח זמנים",
        enforcementDesc:
          "מנוע ההזמנות אוכף לוחות זמנים. שינויים בחלונות השבוע או בימי חופש מתעדכנים מיד ומונעים תורים בלתי אפשריים.",
      },
    },
  },
};
