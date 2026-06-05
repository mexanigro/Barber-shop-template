import type { NichePreset } from "../../types";
import { presetThemeEmployment } from "./themes";

export const employmentPresetHe: NichePreset = {
  businessMode: "solo",
  business: {
    type: "employment",
    legalName: "לכט גריגורי - השמת עובדים",
    address: "ביאליק 44, אשקלון, ישראל",
    cancellationPolicy: "",
  },

  brand: {
    name: "לכט גריגורי",
    tagline: "מחברים בין אנשים לעבודה",
    description:
      "לכט גריגורי מתמחה בהשמת עובדים למשרות במחסנים, סופרמרקטים, ניקיון, לוגיסטיקה, נהגים, בישול, בנייה ועוד. אנחנו כאן בשבילך.",
    logoIconName: "Briefcase",
    faviconEmoji: "💼",
    ogImage: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&q=80&w=1200",
    aiPersona:
      "אתה נציג של לכט גריגורי, חברת השמה ישראלית. תפקידך לעזור למחפשי עבודה להבין את התהליך ולהפנות אותם להרשמה. ענה בעברית, בצורה חמה ומקצועית.",
  },

  theme: presetThemeEmployment,

  hero: {
    titlePrefix: "מחפש",
    titleHighlight: "עבודה?",
    titleSuffix: "אנחנו נמצא לך",
    subtitle:
      "לכט גריגורי מחברת בין מחפשי עבודה למשרות בכל הארץ. הירשם עכשיו ונחזור אליך תוך 24 שעות.",
    ctaPrimary: "הרשמה עכשיו",
    ctaSecondary: "איזה משרות יש?",
    backgroundImage:
      "https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=1920&q=80",
    stats: [
      { value: "500+", label: "עובדים שובצו" },
      { value: "120+", label: "עסקים שותפים" },
      { value: "15+", label: "ערים בישראל" },
    ],
  },

  contact: {
    address: {
      street: "ביאליק 44",
      district: "אשקלון",
      cityStateZip: "אשקלון, ישראל",
    },
    phone: "+972-50-123-4567",
    email: "info@lektgrigori.co.il",
    social: {
      instagram: "",
      facebook: "",
      whatsapp: "https://wa.me/972501234567",
    },
  },

  hours: {
    monday: { start: "08:00", end: "18:00" },
    tuesday: { start: "08:00", end: "18:00" },
    wednesday: { start: "08:00", end: "18:00" },
    thursday: { start: "08:00", end: "18:00" },
    friday: { start: "08:00", end: "14:00" },
    saturday: null,
    sunday: { start: "08:00", end: "18:00" },
  },

  services: [],
  staff: [],

  testimonials: [
    {
      name: "דוד כ.",
      title: "עובד מחסן",
      text: "תוך יומיים מההרשמה כבר התחלתי לעבוד. ממליץ בחום!",
      rating: 5,
    },
    {
      name: "אלינה מ.",
      title: "עובדת סופרמרקט",
      text: "הצוות היה מאוד אדיב ומקצועי. מצאו לי עבודה קרוב לבית.",
      rating: 5,
    },
    {
      name: "אחמד ר.",
      title: "נהג משלוחים",
      text: "שירות מעולה, הכל היה מהיר ופשוט. תודה רבה!",
      rating: 5,
    },
  ],

  gallery: [],

  sections: {
    services: {
      title: "תחומי ההשמה שלנו",
      subtitle: "משרות זמינות",
      images: [],
    },
    team: {
      title: "הצוות שלנו",
      subtitle: "אנשי מקצוע",
      description:
        "הצוות של לכט גריגורי מורכב מאנשי השמה מנוסים שמכירים את שוק העבודה הישראלי. אנחנו כאן כדי לעזור לך למצוא את העבודה המתאימה.",
    },
    whyChooseUs: {
      title: "למה לכט גריגורי?",
      subtitle: "היתרונות שלנו",
      mainImage:
        "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&q=80",
      badge: "10+ שנות\nניסיון",
      benefits: [
        {
          iconName: "Zap",
          title: "שיבוץ מהיר",
          desc: "אנחנו יוצרים קשר תוך 24 שעות מההרשמה ומשבצים עובדים בזמן קצר.",
        },
        {
          iconName: "Shield",
          title: "מעסיקים מאומתים",
          desc: "כל העסקים השותפים שלנו עוברים בדיקה קפדנית כדי להבטיח תנאי עבודה הוגנים.",
        },
        {
          iconName: "Globe",
          title: "תמיכה רב-לשונית",
          desc: "אנחנו דוברים עברית, רוסית, אנגלית וערבית — כדי שאף אחד לא יישאר מאחור.",
        },
        {
          iconName: "MapPin",
          title: "בכל הארץ",
          desc: "מאשקלון ועד חיפה — אנחנו מכסים את כל ישראל עם מאות משרות זמינות.",
        },
      ],
    },
    testimonials: {
      title: "מה אומרים עלינו",
      subtitle: "סיפורי הצלחה",
    },
    gallery: {
      title: "",
      subtitle: "",
    },
    location: {
      title: "איפה אנחנו",
      subtitle: "מצא אותנו",
    },
    contact: {
      title: "צור קשר",
      subtitle: "אנחנו כאן בשבילך",
      description:
        "יש לך שאלה? רוצה לדעת יותר? שלח לנו הודעה ונחזור אליך בהקדם.",
    },
    booking: {
      title: "הרשמה",
      tagline: "תהליך ההרשמה של לכט גריגורי",
      steps: {
        service: "תחום",
        staff: "נציג",
        datetime: "זמן",
        details: "פרטים",
        payment: "אישור",
      },
      aiConsultant: {
        title: "עוזר חכם",
        subtitle: "יש לך שאלות?",
        description: "שאל את העוזר החכם שלנו על משרות פנויות ותהליך ההרשמה.",
        agentLabel: "נציג דיגיטלי",
        placeholder: "למשל: 'אני מחפש עבודה במחסן באשקלון'...",
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
        title: "צוות",
        scheduleTitle: "לוח זמנים",
        commitButton: "שמור",
        enforcementTitle: "אכיפת לוח זמנים",
        enforcementDesc: "",
      },
    },
    faq: {
      title: "שאלות נפוצות",
      subtitle: "כל מה שרצית לדעת",
      items: [
        {
          question: "איך עובד תהליך ההרשמה?",
          answer:
            "פשוט מאוד! ממלאים את הטופס הקצר, ואנחנו יוצרים איתך קשר תוך 24 שעות כדי להבין מה מתאים לך.",
        },
        {
          question: "אילו סוגי משרות יש?",
          answer:
            "מחסנים, סופרמרקטים, ניקיון, לוגיסטיקה, נהגים, בישול/גסטרונומיה, בנייה ועוד.",
        },
        {
          question: "כמה מהר אפשר להתחיל לעבוד?",
          answer:
            "הרבה מהשותפים שלנו צריכים עובדים מיד. לאחר ההרשמה לעיתים קרובות אפשר להתחיל תוך כמה ימים.",
        },
        {
          question: "האם אני צריך ניסיון קודם?",
          answer:
            "לא בהכרח. הרבה משרות לא דורשות ניסיון. נתאים אותך לפי הכישורים וההעדפות שלך.",
        },
        {
          question: "אילו אזורים אתם מכסים?",
          answer:
            "אנחנו פועלים בכל ישראל, עם דגש על הדרום והמרכז.",
        },
      ],
    },
    howItWorks: {
      title: "איך זה עובד",
      subtitle: "שלושה צעדים פשוטים",
      steps: [
        {
          number: "01",
          title: "נרשמים",
          description: "ממלאים טופס קצר עם הפרטים וההעדפות שלך",
          iconName: "UserPlus",
        },
        {
          number: "02",
          title: "אנחנו מתקשרים אליך",
          description: "הצוות שלנו עובר על הפרופיל שלך ויוצר קשר בוואטסאפ או טלפון",
          iconName: "MessageCircle",
        },
        {
          number: "03",
          title: "מתחילים לעבוד",
          description: "מתאימים אותך לעבודה הנכונה ואתה מתחיל להרוויח",
          iconName: "Rocket",
        },
      ],
    },
    jobCategories: {
      title: "תחומי עבודה",
      subtitle: "בחר את התחום שמעניין אותך",
      categories: [
        {
          id: "supermarket",
          label: "סופרמרקטים",
          iconName: "ShoppingCart",
          description: "קופאים, מסדרי מדפים, צוות שטח",
        },
        {
          id: "warehouse",
          label: "מחסנים",
          iconName: "Package",
          description: "מיון, אריזה, ניהול מלאי",
        },
        {
          id: "cleaning",
          label: "ניקיון",
          iconName: "Sparkles",
          description: "משרדים, בניינים, תעשייתי",
        },
        {
          id: "logistics",
          label: "לוגיסטיקה",
          iconName: "Truck",
          description: "טעינה, משלוח, הפצה",
        },
        {
          id: "drivers",
          label: "נהגים",
          iconName: "Car",
          description: "משלוחים, הסעות, שליחויות",
        },
        {
          id: "cooking",
          label: "בישול וגסטרונומיה",
          iconName: "ChefHat",
          description: "צוות מטבח, הכנות, קייטרינג",
        },
        {
          id: "construction",
          label: "בנייה",
          iconName: "HardHat",
          description: "בנייה, שיפוצים, תשתיות",
        },
        {
          id: "other",
          label: "ועוד",
          iconName: "Plus",
          description: "אבטחה, חקלאות, מלונאות ועוד",
        },
      ],
    },
    employmentForm: {
      title: "הרשמה למשרה",
      subtitle: "מלא את הטופס ונחזור אליך תוך 24 שעות",
      steps: {
        name: {
          title: "מה שמך?",
          firstNameLabel: "שם פרטי",
          lastNameLabel: "שם משפחה",
        },
        city: {
          title: "איפה אתה גר?",
          label: "עיר",
          placeholder: "בחר עיר",
        },
        interest: {
          title: "באיזה תחום אתה מעוניין?",
        },
        experience: {
          title: "ספר לנו עליך",
          experienceLabel: "יש לי ניסיון עבודה קודם",
          availabilityLabel: "זמינות",
          driversLicenseLabel: "יש לי רישיון נהיגה",
          languagesLabel: "שפות שאני מדבר/ת",
          languages: [
            { id: "he", label: "עברית" },
            { id: "ru", label: "רוסית" },
            { id: "en", label: "אנגלית" },
            { id: "ar", label: "ערבית" },
            { id: "am", label: "אמהרית" },
            { id: "fr", label: "צרפתית" },
          ],
          availabilityOptions: [
            { id: "fulltime", label: "משרה מלאה" },
            { id: "parttime", label: "משרה חלקית" },
            { id: "flexible", label: "גמיש" },
          ],
        },
        contact: {
          title: "איך ניצור איתך קשר?",
          phoneLabel: "מספר טלפון",
          emailLabel: "אימייל (אופציונלי)",
        },
        summary: {
          title: "סיכום ושליחה",
          submitLabel: "שלח הרשמה",
          successTitle: "ההרשמה נשלחה!",
          successMessage:
            "קיבלנו את הפרטים שלך. הצוות שלנו יצור איתך קשר תוך 24 שעות.",
        },
      },
      cities: [
        "אשקלון",
        "באר שבע",
        "אשדוד",
        "תל אביב",
        "ירושלים",
        "חיפה",
        "נתניה",
        "ראשון לציון",
        "פתח תקווה",
        "חולון",
        "בני ברק",
        "רמת גן",
        "הרצליה",
        "כפר סבא",
        "רחובות",
        "לוד",
        "רמלה",
        "קריית גת",
        "עראד",
        "דימונה",
        "אילת",
        "אופקים",
        "שדרות",
        "נתיבות",
      ],
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ...({
      business: {
        hero: {
          eyebrow: "ללקוחות עסקיים",
          titleLine1: "עובדים מאומתים,",
          titleHighlight: "בלי כאב הראש",
          subtitle:
            "השאר בידיים שלך את העבודה החשובה. אנחנו ננפה, נראיין ונביא לך מועמדים תוך 48 שעות — בכל רחבי הארץ.",
          ctaPrimary: "התחל גיוס",
          ctaSecondary: "ראה איך זה עובד",
          stats: [
            { value: "500+", label: "עובדים זמינים" },
            { value: "120+", label: "עסקים שותפים" },
            { value: "48ש׳", label: "זמן ממוצע למועמד" },
            { value: "15+", label: "ערים בישראל" },
          ],
        },
        benefits: {
          eyebrow: "למה לעבוד איתנו",
          title: "המודל שיחזיר לך את הזמן",
          benefits: [
            {
              iconName: "Clock",
              label: "01",
              title: "מועמד תוך 48 שעות",
              description:
                "בלי לשבת על הטלפון. אנחנו מתחילים את הסינון ברגע שאתה שולח את הבקשה ומציגים לך 3–5 מועמדים מתאימים בתוך יומיים.",
            },
            {
              iconName: "ShieldCheck",
              label: "02",
              title: "מאומתים אחד אחד",
              description:
                "כל עובד עובר אצלנו ראיון אישי, אימות תעודות וזהות, ובדיקת המלצות. אתה לא פוגש מועמדים גולמיים.",
            },
            {
              iconName: "MapPin",
              label: "03",
              title: "כיסוי ארצי",
              description:
                "מאשקלון ועד חיפה — בסיס נתונים של עובדים פעילים בכל אזורי התעשייה, השירותים והבנייה.",
            },
            {
              iconName: "Headphones",
              label: "04",
              title: "מנהל תיק אישי",
              description:
                "איש קשר אחד אצלך לאורך כל ההתקשרות. ענה לוואטסאפ, פתח דחיפויות, מטפל בהחלפות.",
            },
            {
              iconName: "Layers",
              label: "05",
              title: "מבנה גמיש",
              description:
                "משרה מלאה, חלקית, פרויקטלי או החלפת עובד חולה — אנחנו מתאימים את התנאים לעסק שלך.",
            },
          ],
        },
        workers: {
          eyebrow: "באילו תחומים",
          title: "עובדים שמחכים להזדמנות",
          sub: "כל הקטגוריות פעילות ברגע זה. המספרים מתעדכנים כל בוקר.",
          categories: [
            { id: "supermarket", label: "סופרמרקטים", iconName: "ShoppingCart", count: "82 זמינים", description: "קופאים, מסדרי מדפים, צוותי שטח." },
            { id: "warehouse", label: "מחסנים", iconName: "Package", count: "95 זמינים", description: "מיון, אריזה, ניהול מלאי, ליקוט." },
            { id: "cleaning", label: "ניקיון", iconName: "Sparkles", count: "120 זמינים", description: "משרדים, בניינים, תעשייתי." },
            { id: "logistics", label: "לוגיסטיקה", iconName: "Truck", count: "60 זמינים", description: "טעינה, פריקה, הפצה אזורית." },
            { id: "drivers", label: "נהגים", iconName: "Car", count: "44 זמינים", description: "משלוחים, הסעות, שליחויות." },
            { id: "cooking", label: "מטבח וקייטרינג", iconName: "ChefHat", count: "38 זמינים", description: "סוס שף, הכנות, עבודה חמה." },
            { id: "construction", label: "בנייה", iconName: "HardHat", count: "70 זמינים", description: "בנייה, גמר, תשתיות." },
            { id: "other", label: "תחומים נוספים", iconName: "Plus", count: "ביקוש פתוח", description: "אבטחה, חקלאות, מלונאות." },
          ],
        },
        process: {
          eyebrow: "תהליך בן 3 שלבים",
          title: "מבקשת לצוות חדש בשבוע",
          steps: [
            {
              number: "01",
              iconName: "ClipboardList",
              title: "מספרים לנו מה צריך",
              description:
                "טופס קצר, או שיחה של 10 דקות. אומרים תפקיד, כמות, אזור, ודחיפות.",
            },
            {
              number: "02",
              iconName: "Users",
              title: "מקבלים מועמדים",
              description:
                "תוך 48 שעות מקבלים 3–5 מועמדים שעברו סינון. בלי קורות חיים אקראיים, רק התאמות.",
            },
            {
              number: "03",
              iconName: "Rocket",
              title: "מתחילים לעבוד",
              description:
                "בוחרים את האדם הנכון, אנחנו מסיימים את הטפסים, והעובד מתחיל מתי שמתאים לכם.",
            },
          ],
        },
        form: {
          eyebrow: "התחלת גיוס",
          title: "ספר לנו על הצוות שאתה צריך",
          sub: "נחזור אליך באותו יום עם מועמדים אפשריים. ללא התחייבות.",
          fields: {
            companyName: "שם החברה",
            contactName: "איש קשר",
            phone: "טלפון",
            email: "אימייל",
            jobType: "סוג העובדים",
            jobTypePlaceholder: "בחר תחום",
            workerCount: "כמה עובדים",
            workerCountPlaceholder: "למשל: 5",
            city: "עיר / אזור",
            cityPlaceholder: "למשל: אשקלון",
            urgency: "מתי להתחיל",
            notes: "הערות נוספות",
            notesPlaceholder: "פרטים על תפקיד, שעות, דרישות מיוחדות…",
          },
          urgencyOptions: [
            { id: "immediate", label: "מיידי" },
            { id: "week", label: "תוך שבוע" },
            { id: "month", label: "תוך חודש" },
            { id: "flexible", label: "גמיש" },
          ],
          submit: "שלח בקשה",
          submitting: "שולח…",
          successTitle: "הבקשה התקבלה",
          successMessage: "מנהל תיק אישי יחזור אליך תוך שעות העבודה הקרובות.",
          errorMessage: "משהו השתבש. נסה שוב או התקשר אלינו ישירות.",
        },
        testimonials: {
          eyebrow: "מה אומרים העסקים שלנו",
          title: "סוגרים במקום שיחות מיותרות",
          items: [
            {
              quote:
                "הצרכים שלנו השתנו פתאום — צריכים 7 עובדים תוך 4 ימים. לכט גריגורי שלחו 12 מועמדים, סגרנו את כולם.",
              author: "ענת ל.",
              role: "מנהלת תפעול, מחסן לוגיסטי באשדוד",
            },
            {
              quote:
                "אני בעל סופר בקריית גת. בעבר ביזבזתי שלם על מודעות. כאן אני מקבל מועמד מוכן יומיים מהשיחה.",
              author: "יוסי א.",
              role: "מנהל סניף סופרמרקט",
            },
            {
              quote:
                "הדבר שהכי אהבתי זה שלא ביזבזו לי את הזמן. כל מועמד שראיתי היה רלוונטי. זה נדיר.",
              author: "ולאד ק.",
              role: "מנהל אתר בנייה, מרכז",
            },
          ],
        },
        faq: {
          eyebrow: "שאלות מעסיקים",
          title: "כל מה שעסקים שואלים",
          items: [
            {
              question: "האם אתם מטפלים בטפסים?",
              answer:
                "כן. אנחנו מטפלים בכל ההשמה: חוזה, תיעוד, ביטוח, ותלושים — הכול במקום אחד.",
            },
            {
              question: "כמה מהר אפשר להתחיל?",
              answer:
                "תלוי בדחיפות. במקרים דחופים סיפקנו 5+ עובדים בתוך 48 שעות. בדרך כלל צוות שלם מוכן בשבוע.",
            },
            {
              question: "באילו אזורים אתם פועלים?",
              answer:
                "בכל הארץ — דרום, מרכז, צפון. רוב הפעילות שלנו במחוז דרום ובמרכז.",
            },
            {
              question: "מה לגבי עובדים זרים / מהגרים?",
              answer:
                "יש לנו בסיס נתונים רב-לשוני: עברית, רוסית, אנגלית, ערבית. כל העובדים בעלי מעמד חוקי לעבוד בישראל.",
            },
          ],
        },
      },
    } as any),
  },
};
