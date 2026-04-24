import type { NichePreset } from "../../types";
import { presetThemeTattoo } from "./themes";

export const tattooPresetHe: NichePreset = {
  // ─── Business & Legal ────────────────────────────────────────────────────────
  business: {
    type: "tattoo",
    legalName: "MASTERPIECE INK STUDIO LLC",
    address:
      "רח׳ Inkwell 87, אזור האמנות, לוס אנג׳לס, CA 90012, ארצות הברית",
    cancellationPolicy: "48 שעות לפני מועד התור שנקבע",
  },

  // ─── Brand ───────────────────────────────────────────────────────────────────
  brand: {
    name: "MASTERPIECE INK",
    tagline: "כשהעור הופך לאמנות",
    description:
      "סטודיו קעקועים פרימיום — אמנים מוסיפים את החזון שלכם ליצירה קבועה. עיצובים מותאמים, קו עדין ופגישות ייעוץ — כל יצירה חד־פעמית.",
    logoIconName: "Pen",
    aiPersona:
      "אתם מומחה וירטואלי ב־Masterpiece Ink, סטודיו קעקועים יוקרתי. הנחיה בביטחון — שאלות על שירותים, הכנה לסשן, טיפול אחרי ואמן מתאים לחזון. חמים, יודעים ואמנותיים.",
  },

  theme: presetThemeTattoo,

  // ─── Hero ─────────────────────────────────────────────────────────────────────
  hero: {
    titlePrefix: "העור שלכם,",
    titleHighlight: "הבד שלנו",
    titleSuffix: "אמנות קבועה למי שמעז",
    subtitle:
      "כל פרויקט מתחיל בפגישת ייעוץ חינם — ללא התחייבות וללא מקדמה. פגישה עם האמן, הגדרת החזון, ואז קביעת סשן. אמנות מותאמת בדיוק כירורגי.",
    ctaPrimary: "קבעו ייעוץ חינם",
    ctaSecondary: "לתיק עבודות",
    // Tattoo parlor interior — neon lights, displayed flash art, studio atmosphere
    backgroundImage:
      "https://images.unsplash.com/photo-1763888647744-c566e723c396?auto=format&fit=crop&q=80&w=2000",
  },

  // ─── Contact ─────────────────────────────────────────────────────────────────
  contact: {
    address: {
      street: "87 Inkwell Avenue",
      district: "Arts District",
      cityStateZip: "Los Angeles, CA 90012",
    },
    phone: "(213) 555-0194",
    email: "hello@masterpieceink.com",
    social: {
      instagram: "https://instagram.com/masterpieceink",
      facebook: "https://facebook.com/masterpieceink",
      twitter: "https://twitter.com/masterpieceink",
    },
  },

  // ─── Business Hours ───────────────────────────────────────────────────────────
  hours: {
    monday: null,
    tuesday: { start: "11:00", end: "20:00" },
    wednesday: { start: "11:00", end: "20:00" },
    thursday: { start: "11:00", end: "20:00" },
    friday: { start: "11:00", end: "21:00" },
    saturday: { start: "10:00", end: "21:00" },
    sunday: { start: "12:00", end: "18:00" },
  },

  // ─── Services ────────────────────────────────────────────────────────────────
  // CRITICAL: services[i] maps 1:1 to sections.services.images[i].
  // If you add or reorder a service here, update sections.services.images below.
  //
  // Pricing model:
  //   services[0] Free Consultation   → $0 flat — no charge, no commitment
  //   services[1] Custom Design       → $180/hr — billed hourly per session
  //   services[2] Fine Line           → $150/hr — billed hourly per session
  //   services[3] Black & Grey        → $200/hr — billed hourly per session
  //   services[4] Cover-Up & Rework   → $160/hr — billed hourly per session
  //   services[5] Flash & Small       → $120 flat — shop minimum, fixed rate
  //   services[6] Precision Piercing  → $80 flat — fixed rate
  services: [
    {
      id: "consultation",
      name: "פגישת ייעוץ חינם",
      description:
        "מתחילים כאן — ללא עלות וללא התחייבות. פגישה עם האמן ל־30–60 דק׳, סקירת תיק, דיון ברעיון, מיקום וסגנון, ותכנון הפרויקט לפני כל מקדמה.",
      duration: 60,
      price: 0,
    },
    {
      id: "custom-design",
      name: "עיצוב מותאם אישית",
      description:
        "יצירה מקורית סביב החזון שלכם. חיוב לפי 180$ לשעה — רוב הפרויקטים נפרסים על 1–4 סשנים לפי גודל ומורכבות. כולל ייעוץ חינם ואישור סקיצה לפני הסשן.",
      duration: 180,
      price: 180,
    },
    {
      id: "fine-line",
      name: "קו עדין ומינימליזם",
      description:
        "דיוק במחט בודדת לקווים עדינים, מיקרו־ריאליזם והרכבים מינימליסטיים. חיוב לפי 150$ לשעה. עיצובים קטנים מתחת ל־2 אינץ׳ — לעיתים מחיר קבוע; יאושר בייעוץ.",
      duration: 120,
      price: 150,
    },
    {
      id: "black-grey-realism",
      name: "ריאליזם שחור־אפור",
      description:
        "דיוקן היפר־ריאליסטי ותמוניות קולנועיות בשחור־אפור. חיוב לפי 200$ לשעה — פרויקטים גדולים מחולקים לסשנים לרוויית דיו וריפוי מיטבי. דורש ייעוץ חינם.",
      duration: 240,
      price: 200,
    },
    {
      id: "cover-up",
      name: "כיסוי ושיפור קעקוע",
      description:
        "הופכים דיו לא רצוי לאמנות חדשה. ייעוץ חובה להערכת כיסוי. חיוב לפי 160$ לשעה — רוב הכיסויים 2–3 סשנים. מקדמת עיצוב של 100$ אחרי הייעוץ מקוזזת מהחשבון הסופי.",
      duration: 180,
      price: 160,
    },
    {
      id: "flash-small",
      name: "פלאש וקטנים",
      description:
        "עיצובי פלאש מוכנים ויצירות קטנות מתחת ל־3 אינץ׳. מינימום סטודיו החל מ־120$ במחיר קבוע — בלי חיוב שעתי. מתאים למתחילים או להוספה לקולקציה בלי ייעוץ.",
      duration: 60,
      price: 120,
    },
    {
      id: "piercing",
      name: "פירסינג מדויק",
      description:
        "פירסינג מקצועי בטיטניום דרגת שתל ופלדה כירורגית. מלובים קלאסיים ועד סחוס גבוה ועוגנים — מחיר קבוע, שירות באותו יום, ערכת טיפול אחרי מלאה.",
      duration: 30,
      price: 80,
    },
  ],

  // ─── Staff ───────────────────────────────────────────────────────────────────
  staff: [
    {
      id: "izzy",
      slug: "izzy-cross",
      name: "Izzy Cross",
      // Portrait: edgy female tattoo artist, studio environment, professional
      photoUrl:
        "https://images.unsplash.com/photo-1677286061466-7cc3531e5027?auto=format&fit=crop&q=80&w=800",
      specialty: "קו עדין ובוטניקה",
      bio: "חמש שנים כאיורנית בוטנית לפני הקעקועים. קו עדין במחט בודדת עם תחושה אורגנית כמעט אקוורלית. מתמחה בצמחים, חיות ומינימליזם מופשט — יצירות שנראות טבעיות על העור.",
      // Portfolio: finished fine-line tattoos only — no machines, no process shots
      portfolio: [
        "https://images.unsplash.com/photo-1501939387519-cf9c35d4f4eb?auto=format&fit=crop&q=80&w=1200",
        "https://images.unsplash.com/photo-1610942933193-8fafd0973f6d?auto=format&fit=crop&q=80&w=1200",
        "https://images.unsplash.com/photo-1562379825-415aea84ebcf?auto=format&fit=crop&q=80&w=1200",
        "https://images.unsplash.com/photo-1515369867962-4661872b6366?auto=format&fit=crop&q=80&w=1200",
      ],
      social: {
        instagram: "https://instagram.com/izzycross.ink",
        twitter: "https://twitter.com/izzycross",
      },
      schedule: {
        monday: { isOpen: false, hours: { start: "00:00", end: "00:00" }, breaks: [] },
        tuesday: { isOpen: true, hours: { start: "11:00", end: "19:00" }, breaks: [{ start: "14:00", end: "15:00", label: "צהריים" }] },
        wednesday: { isOpen: true, hours: { start: "11:00", end: "19:00" }, breaks: [{ start: "14:00", end: "15:00", label: "צהריים" }] },
        thursday: { isOpen: true, hours: { start: "11:00", end: "19:00" }, breaks: [{ start: "14:00", end: "15:00", label: "צהריים" }] },
        friday: { isOpen: true, hours: { start: "11:00", end: "20:00" }, breaks: [{ start: "15:00", end: "16:00", label: "הפסקה" }] },
        saturday: { isOpen: true, hours: { start: "10:00", end: "18:00" }, breaks: [] },
        sunday: { isOpen: false, hours: { start: "00:00", end: "00:00" }, breaks: [] },
      },
    },
    {
      id: "marco",
      slug: "marco-veil",
      name: "Marco Veil",
      // Portrait: male tattoo artist, tattooed arms, professional studio setting
      photoUrl:
        "https://images.unsplash.com/photo-1746703509843-af889aa20300?auto=format&fit=crop&q=80&w=800",
      specialty: "ריאליזם שחור־אפור",
      bio: "מרקו נחשב לאחד אמני הריאליזם השחור־אפור המובילים בחוף המערבי. מעל 14 שנות ניסיון, דיוקנים היפר־מפורטים והרכבים קולנועיים שפורסמו בכתבי עת בינלאומיים. כל יצירה — לימוד באור, צל וקביעות.",
      // Portfolio: finished black & grey realism tattoos only
      portfolio: [
        "https://images.unsplash.com/photo-1707390588496-6c50ad954935?auto=format&fit=crop&q=80&w=1200",
        "https://images.unsplash.com/photo-1699270065530-eb99dbf1d77e?auto=format&fit=crop&q=80&w=1200",
        "https://images.unsplash.com/photo-1640202352521-66c98a02e612?auto=format&fit=crop&q=80&w=1200",
        "https://images.unsplash.com/photo-1662524518420-bbded8ec7811?auto=format&fit=crop&q=80&w=1200",
      ],
      social: {
        instagram: "https://instagram.com/marcoveil.tattoo",
        twitter: "https://twitter.com/marcoveil",
      },
      schedule: {
        monday: { isOpen: false, hours: { start: "00:00", end: "00:00" }, breaks: [] },
        tuesday: { isOpen: false, hours: { start: "00:00", end: "00:00" }, breaks: [] },
        wednesday: { isOpen: true, hours: { start: "12:00", end: "20:00" }, breaks: [{ start: "16:00", end: "17:00", label: "הפסקה" }] },
        thursday: { isOpen: true, hours: { start: "12:00", end: "20:00" }, breaks: [{ start: "16:00", end: "17:00", label: "הפסקה" }] },
        friday: { isOpen: true, hours: { start: "11:00", end: "21:00" }, breaks: [{ start: "15:00", end: "16:00", label: "צהריים" }] },
        saturday: { isOpen: true, hours: { start: "10:00", end: "21:00" }, breaks: [{ start: "14:00", end: "15:00", label: "צהריים" }] },
        sunday: { isOpen: true, hours: { start: "12:00", end: "18:00" }, breaks: [] },
      },
    },
    {
      id: "devon",
      slug: "devon-ash",
      name: "Devon Ash",
      // Portrait: non-binary/androgynous artist, creative professional look
      photoUrl:
        "https://images.unsplash.com/photo-1659693707379-f7b696d92011?auto=format&fit=crop&q=80&w=800",
      specialty: "עיצוב מותאם וכיסויים",
      bio: "דבון פותרת אתגרים המורכבים ביותר בסטודיו. רקע בעיצוב גרפי והרכבים נועזים — מתמחה בפרויקטים מותאמים ובכיסוי קעקועים טרנספורמטיבי. סיפור על העור — או תיקון — דבון האמנית שלכם.",
      // Portfolio: finished bold custom and cover-up tattoos only
      portfolio: [
        "https://images.unsplash.com/photo-1759247943688-5d47a84dd615?auto=format&fit=crop&q=80&w=1200",
        "https://images.unsplash.com/photo-1712212601990-8274d5566304?auto=format&fit=crop&q=80&w=1200",
        "https://images.unsplash.com/photo-1479767574301-a01c78234a0c?auto=format&fit=crop&q=80&w=1200",
        "https://images.unsplash.com/photo-1686577677352-c9249ed5972a?auto=format&fit=crop&q=80&w=1200",
      ],
      social: {
        instagram: "https://instagram.com/devonash.ink",
      },
      schedule: {
        monday: { isOpen: false, hours: { start: "00:00", end: "00:00" }, breaks: [] },
        tuesday: { isOpen: true, hours: { start: "11:00", end: "20:00" }, breaks: [{ start: "15:00", end: "16:00", label: "הפסקה" }] },
        wednesday: { isOpen: true, hours: { start: "11:00", end: "20:00" }, breaks: [{ start: "15:00", end: "16:00", label: "הפסקה" }] },
        thursday: { isOpen: true, hours: { start: "11:00", end: "20:00" }, breaks: [{ start: "15:00", end: "16:00", label: "הפסקה" }] },
        friday: { isOpen: true, hours: { start: "11:00", end: "20:00" }, breaks: [{ start: "15:00", end: "16:00", label: "הפסקה" }] },
        saturday: { isOpen: true, hours: { start: "10:00", end: "19:00" }, breaks: [] },
        sunday: { isOpen: false, hours: { start: "00:00", end: "00:00" }, breaks: [] },
      },
    },
  ],

  // ─── Testimonials ─────────────────────────────────────────────────────────────
  testimonials: [
    {
      name: "Serena Blackwood",
      title: "מנהלת אמנות",
      text: "איזי הפכה רעיון שישב לי שלוש שנים ליצירת קו עדין מרהיבה. שווה את הנסיעה רק בשביל הייעוץ.",
      rating: 5,
    },
    {
      name: "Damien Cruz",
      title: "יוצר קולנוע",
      text: "הריאליזם השחור־אפור של מרקו ברמה אחרת. השרוול נראה כמו צילום — עוצרים אותי ברחוב. שווה כל שקל.",
      rating: 5,
    },
    {
      name: "Priya Nolan",
      title: "אדריכלית",
      text: "פחדתי מכיסוי. דבון העריכה את הקעקוע הישן, עיצבה משהו מותאם לגמרי — התוצאה לא נראית כמו לפני. טרנספורמציה.",
      rating: 5,
    },
  ],

  // ─── Gallery ─────────────────────────────────────────────────────────────────
  // 12 curated finished-tattoo portfolio shots.
  // Rule: NO machines, NO process shots, NO bare needles. Only completed art on skin.
  gallery: [
    "https://images.unsplash.com/photo-1479767574301-a01c78234a0c?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1501939387519-cf9c35d4f4eb?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1610942933193-8fafd0973f6d?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1562379825-415aea84ebcf?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1515369867962-4661872b6366?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1707390588496-6c50ad954935?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1699270065530-eb99dbf1d77e?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1640202352521-66c98a02e612?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1662524518420-bbded8ec7811?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1759247943688-5d47a84dd615?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1712212601990-8274d5566304?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1686577677352-c9249ed5972a?auto=format&fit=crop&q=80&w=1200",
  ],

  // ─── Section Copy ─────────────────────────────────────────────────────────────
  sections: {
    services: {
      title: "מלאכה ומשמעת",
      subtitle: "השירותים שלנו",
      // ACTION / ENVIRONMENT shots — one per service, same order as services[].
      // services[0] Free Consultation     → artist reviewing designs with client in studio
      // services[1] Custom Design         → artist drawing/tattooing a detailed custom piece
      // services[2] Fine Line             → needle close-up on delicate fine line work
      // services[3] Black & Grey Realism  → artist shading a realistic portrait tattoo
      // services[4] Cover-Up & Rework     → artist working over an existing tattoo
      // services[5] Flash & Small Pieces  → close-up of precise small tattoo work
      // services[6] Precision Piercing    → professional piercing-related close-up
      images: [
        "https://images.unsplash.com/photo-1775135981378-4e7c1767436d?auto=format&fit=crop&q=80&w=600",
        "https://images.unsplash.com/photo-1753283463956-57f16faf217c?auto=format&fit=crop&q=80&w=600",
        "https://images.unsplash.com/photo-1769605767681-749db570b426?auto=format&fit=crop&q=80&w=600",
        "https://images.unsplash.com/photo-1769605767707-80909ec160cc?auto=format&fit=crop&q=80&w=600",
        "https://images.unsplash.com/photo-1769605767720-6b512d96aa4e?auto=format&fit=crop&q=80&w=600",
        "https://images.unsplash.com/photo-1710367847914-a1c8d2c5aa63?auto=format&fit=crop&q=80&w=600",
        "https://images.unsplash.com/photo-1692220361348-70bc089b3e6d?auto=format&fit=crop&q=80&w=600",
      ],
    },
    team: {
      title: "דיו וזהות // v1.0",
      subtitle: "האמנים",
      description:
        "כל אמן ב־Masterpiece Ink נבחר לא רק לשליטה טכנית אלא לקול יצירתי ברור. לא מגייסים טכנאים — מאכסנים חזונאים. העור שלכם ראוי לזה.",
    },
    whyChooseUs: {
      title: "הסטנדרט",
      subtitle: "למה לבחור בנו",
      // Premium tattoo studio interior — clean, professional, dramatic lighting
      mainImage:
        "https://images.unsplash.com/photo-1760877611905-0f885a3ce551?auto=format&fit=crop&q=80&w=1000",
      badge: "10 שנים\nשל אמנות",
      benefits: [
        {
          iconName: "ShieldCheck",
          title: "היגיינה ברמת רפואה",
          desc: "מחטים חד־פעמיות, ציוד מעוקל באוטוקלב וחיטוי משטחים אחרי כל לקוח. הבטיחות שלכם — לא למו״מ.",
        },
        {
          iconName: "Clock",
          title: "ייעוץ לפני הכול",
          desc: "כל פרויקט מתחיל בפגישת ייעוץ ייעודית. משקיעים בזמן להבין את החזון לפני שורה אחת — קביעות דורשת שלמות.",
        },
        {
          iconName: "Award",
          title: "אמנים זוכי פרסים",
          desc: "הצוות זכה בפרסים בכנסים בינלאומיים ופורסם במגזינים מובילים. אתם בכיסא של כישרון עולמי.",
        },
        {
          iconName: "Zap",
          title: "רק אמנות מותאמת",
          desc: "בלי קירות פלאש מוכנים ובלי תבניות. כל קעקוע הוא יצירה מקורית בשבילכם בלבד — ללא שכפול.",
        },
      ],
    },
    testimonials: {
      title: "קולות אמון",
      subtitle: "מה אומרים הלקוחות",
    },
    gallery: {
      title: "יצירות קבועות",
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
        "מוכנים להגשים את החזון? שלחו הודעה, צרפו תמונות השראה, ואחד האמנים יחזור לתאם ייעוץ.",
    },
    booking: {
      title: "קביעת ביקור",
      tagline: "מתחילים בייעוץ חינם — ואז קובעים סשן כשאתם מוכנים.",
      steps: {
        service: "שירות",
        staff: "אמן",
        datetime: "תזמון",
        details: "אישור",
        payment: "תשלום",
      },
      aiConsultant: {
        title: "אינטליגנציית דיו",
        subtitle: "לא בטוחים מאיפה?",
        description:
          "תארו את הרעיון והמומחה הווירטואלי ימליץ על שירות, סגנון ואמן — כדי להגיע לייעוץ מוכנים.",
        agentLabel: "יועץ יצירתי",
        placeholder:
          "תארו את הרעיון (למשל: בוטניקה עדינה על פרק כף היד, מינימליסטי)...",
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
        title: "צוות אמנים",
        scheduleTitle: "חלון שבועי בסטודיו",
        commitButton: "שמירת לוח זמנים",
        enforcementTitle: "אכיפת לוח זמנים",
        enforcementDesc:
          "מנוע ההזמנות אוכף את לוחות האמנים. שינויים בחלונות השבוע או בימי חופש מתעדכנים מיד בממשק ומונעים תורים בלתי אפשריים.",
      },
    },
  },
};
