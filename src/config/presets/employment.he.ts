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
    ogImage: "/og-employment.png",
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
          question: "האם השירות עולה כסף?",
          answer:
            "לא! השירות לחפשי עבודה הוא חינם לחלוטין. אנחנו מתוגמלים על ידי העסקים.",
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
  },
};
