import type { NichePreset } from "../../types";
import { presetThemeEstetica } from "./themes";

export const esteticaPresetHe: NichePreset = {
  business: {
    type: "estetica",
    legalName: 'LUMIÈRE CLINIC בע"מ',
    address: "שדרות אבא אבן 12, הרצליה פיתוח, 4672530, ישראל",
    cancellationPolicy: "ביטול עד 24 שעות לפני מועד הטיפול",
  },

  brand: {
    name: "LUMIÈRE CLINIC",
    tagline: "המדע של יופי טבעי",
    description:
      "קליניקה פרימיום לאסתטיקה רפואית — פילרים, בוטוקס, טיפולי פנים וחידוש עור. רופאים מוסמכים, מוצרים מאושרי משרד הבריאות ופרוטוקולים אישיים.",
    logoIconName: "Sparkles",
    ogImage: "/og-opengraph-barber.png",
    aiPersona:
      "את יועצת עור וירטואלית בקליניקת אסתטיקה רפואית מובילה. הנחי את הלקוחות בחום ובדיוק קליני, ענו על שאלות בנושא הזרקות, טיפולי פנים ובעיות עור, והמליצי על הטיפול המתאים ביותר.",
  },

  theme: presetThemeEstetica,

  hero: {
    titlePrefix: "המדע",
    titleHighlight: "של יופי",
    titleSuffix: "טבעי",
    subtitle:
      "מומחים מוסמכים. מוצרים מאושרים. תוצאות שנראות כמוך — רק טוב יותר.",
    ctaPrimary: "קבעו ייעוץ חינם",
    ctaSecondary: "הטיפולים שלנו",
    backgroundImage:
      "https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?auto=format&fit=crop&q=80&w=2000",
  },

  contact: {
    address: {
      street: "שדרות אבא אבן 12",
      district: "הרצליה פיתוח",
      cityStateZip: "הרצליה, 4672530",
    },
    phone: "09-951-0033",
    email: "hello@lumiereclinic.co.il",
    social: {
      instagram: "https://instagram.com/lumiereclinic.il",
    },
  },

  hours: {
    monday: { start: "09:00", end: "18:00" },
    tuesday: { start: "09:00", end: "18:00" },
    wednesday: { start: "09:00", end: "18:00" },
    thursday: { start: "09:00", end: "18:00" },
    friday: { start: "09:00", end: "14:00" },
    saturday: null,
    sunday: { start: "09:00", end: "18:00" },
  },

  // ─── Services ────────────────────────────────────────────────────────────────
  // CRITICAL: services[i] maps 1:1 to sections.services.images[i].
  // If you add a service here, add its corresponding image below.
  services: [
    {
      id: "lip-filler",
      name: "פילר שפתיים",
      description:
        "נפח עדין והגדרה מדויקת עם חומצה היאלורונית פרימיום. קו שפתיים טבעי, ללא זמן החלמה, תוצאות מיידיות.",
      duration: 45,
      price: 1800,
    },
    {
      id: "cheek-filler",
      name: "פילר לחיים וקו לסת",
      description:
        "עיצוב מבני עם חומצה היאלורונית cross-linked. שחזור נפח, הרמה והגדרה של אמצע הפנים בדיוק קליני.",
      duration: 50,
      price: 2200,
    },
    {
      id: "botox",
      name: "בוטוקס",
      description:
        "נוירומודולטור מאושר לקמטי הבעה — מצח, רגליי עורב וקמט בין הגבות. תוצאה עדינה, טבעית, ללא השבתה.",
      duration: 30,
      price: 1400,
    },
    {
      id: "facial",
      name: "טיפול פנים סיגנטורי",
      description:
        "טיפול פנים קליני מותאם אישית — ניקוי עומק, פילינג רפואי וסרומים ממוקדים. זוהר מיידי.",
      duration: 60,
      price: 750,
    },
    {
      id: "skin-booster",
      name: "סקין בוסטר",
      description:
        "מיקרו-הזרקות של חומצה היאלורונית לא-מקושרת ללחות עמוקה, שיפור גמישות ושחזור ברק פנימי.",
      duration: 45,
      price: 2000,
    },
  ],

  staff: [
    {
      id: "dr-anika",
      slug: "dr-anika-chen",
      name: "ד״ר אניקה צ׳ן",
      photoUrl:
        "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=800",
      specialty: "אסתטיקה רפואית והזרקות",
      bio: "מומחית באסתטיקה רפואית עם למעלה מ-10 שנות ניסיון בהזרקות פנים. ד״ר צ׳ן ידועה בגישת ה-'פחות זה יותר' — חיזוק התווים הטבעיים מבלי לשנות את הזהות.",
      portfolio: [
        "https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&q=80&w=1200",
        "https://images.unsplash.com/photo-1512290923902-8a9f81dc236c?auto=format&fit=crop&q=80&w=1200",
        "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&q=80&w=1200",
        "https://images.unsplash.com/photo-1519823551278-64ac92734fb1?auto=format&fit=crop&q=80&w=1200",
      ],
      social: {
        instagram: "https://instagram.com/dranikachen",
      },
      schedule: {
        monday: {
          isOpen: true,
          hours: { start: "09:00", end: "18:00" },
          breaks: [{ start: "13:00", end: "14:00", label: "צהריים" }],
        },
        tuesday: {
          isOpen: true,
          hours: { start: "09:00", end: "18:00" },
          breaks: [{ start: "13:00", end: "14:00", label: "צהריים" }],
        },
        wednesday: {
          isOpen: true,
          hours: { start: "09:00", end: "18:00" },
          breaks: [{ start: "13:00", end: "14:00", label: "צהריים" }],
        },
        thursday: {
          isOpen: true,
          hours: { start: "09:00", end: "18:00" },
          breaks: [{ start: "13:00", end: "14:00", label: "צהריים" }],
        },
        friday: {
          isOpen: true,
          hours: { start: "09:00", end: "14:00" },
          breaks: [],
        },
        saturday: {
          isOpen: false,
          hours: { start: "00:00", end: "00:00" },
          breaks: [],
        },
        sunday: {
          isOpen: true,
          hours: { start: "09:00", end: "18:00" },
          breaks: [{ start: "13:00", end: "14:00", label: "צהריים" }],
        },
      },
    },
    {
      id: "maya",
      slug: "maya-torres",
      name: "מאיה טורס",
      photoUrl:
        "https://images.unsplash.com/photo-1594744803329-e58b31de8bf5?auto=format&fit=crop&q=80&w=800",
      specialty: "טיפולי פנים מתקדמים ובריאות העור",
      bio: "קוסמטיקאית רפואית עם הסמכה כפולה בטיפוח קליני ופילינגים כימיים. מאיה מתכננת כל טיפול פנים כפרוטוקול — שיטתי, מבוסס ראיות ומותאם למצב העור הנוכחי.",
      portfolio: [
        "https://images.unsplash.com/photo-1616394584738-fc6e612e71b9?auto=format&fit=crop&q=80&w=1200",
        "https://images.unsplash.com/photo-1601049541271-70d659f88be8?auto=format&fit=crop&q=80&w=1200",
        "https://images.unsplash.com/photo-1515377905703-c4788e51af15?auto=format&fit=crop&q=80&w=1200",
        "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&q=80&w=1200",
      ],
      social: {
        instagram: "https://instagram.com/mayatorres_skin",
      },
      schedule: {
        monday: {
          isOpen: true,
          hours: { start: "10:00", end: "18:00" },
          breaks: [{ start: "13:30", end: "14:30", label: "הפסקה" }],
        },
        tuesday: {
          isOpen: true,
          hours: { start: "10:00", end: "18:00" },
          breaks: [{ start: "13:30", end: "14:30", label: "הפסקה" }],
        },
        wednesday: {
          isOpen: true,
          hours: { start: "10:00", end: "18:00" },
          breaks: [{ start: "13:30", end: "14:30", label: "הפסקה" }],
        },
        thursday: {
          isOpen: true,
          hours: { start: "10:00", end: "18:00" },
          breaks: [{ start: "13:30", end: "14:30", label: "הפסקה" }],
        },
        friday: {
          isOpen: true,
          hours: { start: "09:00", end: "14:00" },
          breaks: [],
        },
        saturday: {
          isOpen: false,
          hours: { start: "00:00", end: "00:00" },
          breaks: [],
        },
        sunday: {
          isOpen: false,
          hours: { start: "00:00", end: "00:00" },
          breaks: [],
        },
      },
    },
    {
      id: "david",
      slug: "david-park",
      name: "דייויד פארק, RN",
      photoUrl:
        "https://images.unsplash.com/photo-1582750433449-648ed127bb54?auto=format&fit=crop&q=80&w=800",
      specialty: "מומחה הזרקות וסקין בוסטר",
      bio: "אח מוסמך עם התמחות מתקדמת בפילרים ופרוטוקולי סקין בוסטר. דייויד משלב דיוק קליני עם עין אמנותית לסימטריה ופרופורציה פנים.",
      portfolio: [
        "https://images.unsplash.com/photo-1612817288484-6f916006741a?auto=format&fit=crop&q=80&w=1200",
        "https://images.unsplash.com/photo-1583772096048-47cb5ca30a6f?auto=format&fit=crop&q=80&w=1200",
        "https://images.unsplash.com/photo-1560472355-536de3962603?auto=format&fit=crop&q=80&w=1200",
        "https://images.unsplash.com/photo-1631217868264-e5b90bb7e133?auto=format&fit=crop&q=80&w=1200",
      ],
      social: {
        instagram: "https://instagram.com/davidpark_aesthetics",
      },
      schedule: {
        monday: {
          isOpen: true,
          hours: { start: "09:00", end: "17:00" },
          breaks: [{ start: "12:30", end: "13:30", label: "צהריים" }],
        },
        tuesday: {
          isOpen: true,
          hours: { start: "09:00", end: "17:00" },
          breaks: [{ start: "12:30", end: "13:30", label: "צהריים" }],
        },
        wednesday: {
          isOpen: true,
          hours: { start: "09:00", end: "17:00" },
          breaks: [{ start: "12:30", end: "13:30", label: "צהריים" }],
        },
        thursday: {
          isOpen: true,
          hours: { start: "09:00", end: "17:00" },
          breaks: [{ start: "12:30", end: "13:30", label: "צהריים" }],
        },
        friday: {
          isOpen: false,
          hours: { start: "00:00", end: "00:00" },
          breaks: [],
        },
        saturday: {
          isOpen: false,
          hours: { start: "00:00", end: "00:00" },
          breaks: [],
        },
        sunday: {
          isOpen: true,
          hours: { start: "09:00", end: "17:00" },
          breaks: [{ start: "12:30", end: "13:30", label: "צהריים" }],
        },
      },
    },
  ],

  testimonials: [
    {
      name: "שירה לוי",
      title: "מנהלת שיווק",
      text: "פחדתי שזה ייראה מוגזם. ד״ר צ׳ן הרגיעה אותי לגמרי והתוצאות כל כך טבעיות — חברות שלי פשוט אומרות שאני נראית נחה. בדיוק מה שרציתי.",
      rating: 5,
    },
    {
      name: "נועה מזרחי",
      title: "אדריכלית פנים",
      text: "טיפולי הפנים של מאיה הם היחידים שבאמת שינו את העור שלי לטווח ארוך. אחרי שלוש פגישות המרקם והטון נראים אחרת לגמרי. אני מכורה.",
      rating: 5,
    },
    {
      name: "דנה רביד",
      title: "עורכת דין",
      text: "נקי, שקט, מקצועי. בלי מכירות מוגזמות, בלי לחץ. דייויד הסביר כל שלב לפני שנגע בפנים. התוצאה של הפילר שפתיים עדינה ומושלמת.",
      rating: 5,
    },
  ],

  // ─── Gallery ─────────────────────────────────────────────────────────────────
  // 12 curated clinical aesthetics images: treatments, results, clinic environment.
  gallery: [
    "https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1616394584738-fc6e612e71b9?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1512290923902-8a9f81dc236c?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1601049541271-70d659f88be8?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1515377905703-c4788e51af15?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1612817288484-6f916006741a?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1560472355-536de3962603?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1631217868264-e5b90bb7e133?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1519823551278-64ac92734fb1?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1583772096048-47cb5ca30a6f?auto=format&fit=crop&q=80&w=1200",
  ],

  sections: {
    services: {
      title: "פרוטוקולים מדויקים",
      subtitle: "הטיפולים שלנו",
      // One image per service, same order as services[].
      images: [
        "https://images.unsplash.com/photo-1512290923902-8a9f81dc236c?auto=format&fit=crop&q=80&w=600",
        "https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&q=80&w=600",
        "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&q=80&w=600",
        "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&q=80&w=600",
        "https://images.unsplash.com/photo-1519823551278-64ac92734fb1?auto=format&fit=crop&q=80&w=600",
      ],
    },
    team: {
      title: "המומחים שלנו",
      subtitle: "ידיים מקצועיות",
      description:
        "רופאים מוסמכים, קוסמטיקאיות רפואיות ואחים מוסמכים — כולם עם שנות הכשרה קלינית ומחויבות משותפת לתוצאות טבעיות מבוססות ראיות.",
    },
    whyChooseUs: {
      title: "הסטנדרט שלנו",
      subtitle: "למה Lumière",
      mainImage:
        "https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&q=80&w=1000",
      badge: "מומחים\nמוסמכים",
      benefits: [
        {
          iconName: "ShieldCheck",
          title: "מוצרים מאושרים",
          desc: "כל חומר הזרקה ומוצר בקליניקה מאושר על ידי משרד הבריאות. אנחנו לעולם לא מתפשרים על בטיחות.",
        },
        {
          iconName: "Award",
          title: "מטפלים מוסמכים",
          desc: "הצוות שלנו מחזיק בהסמכות מתקדמות והתמחויות רפואיות. השתלמויות הן לא בחירה — הן חובה.",
        },
        {
          iconName: "HeartHandshake",
          title: "פילוסופיית תוצאות טבעיות",
          desc: "אנחנו משפרים, לא משנים. כל תוכנית טיפול מעוצבת כדי לשמר את התווים הייחודיים שלך — לעולם לא למחוק אותם.",
        },
        {
          iconName: "Microscope",
          title: "פרוטוקולים אישיים",
          desc: "אין שני פנים זהים. כל לקוחה מקבלת הערכה מותאמת ותוכנית טיפול שנבנית סביב האנטומיה והמטרות שלה.",
        },
      ],
    },
    testimonials: {
      title: "חוויות לקוחות",
      subtitle: "מה הן אומרות",
    },
    gallery: {
      title: "לפני ואחרי",
      subtitle: "תוצאות אמיתיות",
    },
    location: {
      title: "בואו לבקר",
      subtitle: "מצאו את הקליניקה",
    },
    contact: {
      title: "צרו קשר",
      subtitle: "ייעוץ חינם",
      description:
        "לא בטוחים איזה טיפול מתאים? קבעו ייעוץ ללא עלות ואחד מהמומחים שלנו יבנה תוכנית מותאמת אישית.",
    },
    booking: {
      title: "קביעת טיפול",
      tagline: "המדע של יופי טבעי",
      steps: {
        service: "טיפול",
        staff: "מומחה",
        datetime: "מועד",
        details: "אישור",
        payment: "תשלום",
      },
      aiConsultant: {
        title: "יועצת עור חכמה",
        subtitle: "לא יודעים מאיפה להתחיל?",
        description:
          "תארו את בעיית העור והיועצת שלנו תציע את הטיפול המתאים ביותר.",
        agentLabel: "יועצת עור",
        placeholder:
          "תארו את מה שמפריע לכם (קמטים סביב העיניים, אובדן נפח בלחיים, עור עייף)...",
      },
      success: {
        title: "אושר",
        confirmed: "התור נקבע!",
        requestSaved: "הבקשה נשמרה!",
        cancelled: "בוטל",
      },
    },
    admin: {
      staff: {
        title: "מאגר מומחים",
        scheduleTitle: "זמינות שבועית",
        commitButton: "שמירת לוח זמנים",
        enforcementTitle: "אכיפת זמינות",
        enforcementDesc:
          "לוחות הזמנים של המומחים נאכפים בזמן אמת. שינויים בזמינות או חסימת ימים נכנסים לתוקף מיד ומונעים כפילויות בתורים.",
      },
    },
  },
};
