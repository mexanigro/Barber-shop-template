import type { NichePreset } from "../../types";
import { presetThemeAbogado } from "./themes";

export const abogadoPresetHe: NichePreset = {
  business: {
    type: "abogado",
    legalName: "MERIDIAN LAW GROUP S.L.P.",
    address:
      "8 Paseo de la Castellana, Torre Norte, Piso 14, Madrid, 28046, España",
    cancellationPolicy:
      "48 שעות עסקים לפני מועד הייעוץ",
  },

  brand: {
    name: "MERIDIAN LAW",
    tagline: "דיוק. יושרה. תוצאות.",
    description:
      "משרד בוטיק בתחומי דיני חברות, עבודה ואזרחי. ייעוץ מהימן לעסקים וליחידים.",
    logoIconName: "Scale",
    aiPersona:
      "את עוזר וירטואלי של Meridian Law. הצג את תחומי העיסוק, עזור להבין איזה סוג ייעוץ נדרש והנחה לקביעת פגישה עם העו״ד המתאים. אל תיתן ייעוץ משפטי מחייב.",
  },

  theme: presetThemeAbogado,

  hero: {
    titlePrefix: "ייעוץ",
    titleHighlight: "מהימן",
    titleSuffix: "לעניינים מורכבים",
    subtitle:
      "אסטרטגיה משפטית לעסקים וליחידים. עשורים של ניסיון בדיני חברות, עבודה ואזרחי.",
    ctaPrimary: "קבעו ייעוץ",
    ctaSecondary: "תחומי עיסוק",
    backgroundImage:
      "https://images.unsplash.com/photo-1589994965851-a8f479c573a9?auto=format&fit=crop&q=80&w=2000",
  },

  contact: {
    address: {
      street: "8 Paseo de la Castellana, Torre Norte",
      district: "Piso 14, Distrito Financiero",
      cityStateZip: "Madrid, 28046",
    },
    phone: "+34 91 700 8800",
    email: "contact@meridianlaw.es",
    social: {
      instagram: "https://instagram.com/meridianlaw",
      twitter: "https://twitter.com/meridianlaw",
    },
  },

  hours: {
    monday: { start: "09:00", end: "19:00" },
    tuesday: { start: "09:00", end: "19:00" },
    wednesday: { start: "09:00", end: "19:00" },
    thursday: { start: "09:00", end: "19:00" },
    friday: { start: "09:00", end: "18:00" },
    saturday: null,
    sunday: null,
  },

  services: [
    {
      id: "consulta-inicial",
      name: "Initial Legal Consultation",
      description:
        "Thorough assessment of your case, legal strategy overview, and clear guidance on next steps.",
      duration: 60,
      price: 180,
    },
    {
      id: "contratos",
      name: "Contract Drafting & Review",
      description:
        "Preparation and analysis of commercial contracts, NDAs, and service agreements with full legal protection.",
      duration: 90,
      price: 350,
    },
    {
      id: "constitucion",
      name: "Business Incorporation",
      description:
        "Full legal support for company formation: deed drafting, registry filing, and compliance setup.",
      duration: 120,
      price: 600,
    },
    {
      id: "laboral",
      name: "Employment Law Advisory",
      description:
        "Advice on hiring, dismissals, collective agreements, and workplace disputes for employers and employees.",
      duration: 60,
      price: 220,
    },
  ],

  staff: [
    {
      id: "elena",
      slug: "elena-casado",
      name: "Elena Casado",
      photoUrl:
        "https://images.unsplash.com/photo-1573496799652-408c2ac9fe98?auto=format&fit=crop&q=80&w=800",
      specialty: "Corporate & M&A Law",
      bio: "Partner and co-founder of Meridian Law. Elena has 15 years of experience in corporate transactions, mergers, and commercial contracts. She advises startups and Fortune 500 clients alike.",
      portfolio: [
        "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&q=80&w=1200",
        "https://images.unsplash.com/photo-1589994965851-a8f479c573a9?auto=format&fit=crop&q=80&w=1200",
        "https://images.unsplash.com/photo-1521791055366-0d553872952f?auto=format&fit=crop&q=80&w=1200",
        "https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&q=80&w=1200",
      ],
      social: {
        twitter: "https://twitter.com/elenacasado_law",
      },
      schedule: {
        monday: {
          isOpen: true,
          hours: { start: "09:00", end: "18:00" },
          breaks: [{ start: "14:00", end: "15:00", label: "Lunch" }],
        },
        tuesday: {
          isOpen: true,
          hours: { start: "09:00", end: "18:00" },
          breaks: [{ start: "14:00", end: "15:00", label: "Lunch" }],
        },
        wednesday: {
          isOpen: true,
          hours: { start: "09:00", end: "18:00" },
          breaks: [{ start: "14:00", end: "15:00", label: "Lunch" }],
        },
        thursday: {
          isOpen: true,
          hours: { start: "09:00", end: "18:00" },
          breaks: [{ start: "14:00", end: "15:00", label: "Lunch" }],
        },
        friday: {
          isOpen: true,
          hours: { start: "09:00", end: "17:00" },
          breaks: [{ start: "14:00", end: "15:00", label: "Lunch" }],
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
      id: "marcos",
      slug: "marcos-gimenez",
      name: "Marcos Giménez",
      photoUrl:
        "https://images.unsplash.com/photo-1556157382-97eda2d62296?auto=format&fit=crop&q=80&w=800",
      specialty: "Employment & Labour Law",
      bio: "Marcos specialises in individual and collective labour relations, representing both employers and workers before the Social Courts. Recognised by Chambers & Partners for three consecutive years.",
      portfolio: [
        "https://images.unsplash.com/photo-1568992687947-868a62a9f521?auto=format&fit=crop&q=80&w=1200",
        "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?auto=format&fit=crop&q=80&w=1200",
        "https://images.unsplash.com/photo-1551836022-deb4988cc6c0?auto=format&fit=crop&q=80&w=1200",
        "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=1200",
      ],
      social: {
        twitter: "https://twitter.com/mgimenez_abog",
        instagram: "https://instagram.com/marcosgimenezlaw",
      },
      schedule: {
        monday: {
          isOpen: true,
          hours: { start: "10:00", end: "19:00" },
          breaks: [{ start: "14:00", end: "15:00", label: "Lunch" }],
        },
        tuesday: {
          isOpen: true,
          hours: { start: "10:00", end: "19:00" },
          breaks: [{ start: "14:00", end: "15:00", label: "Lunch" }],
        },
        wednesday: {
          isOpen: false,
          hours: { start: "00:00", end: "00:00" },
          breaks: [],
        },
        thursday: {
          isOpen: true,
          hours: { start: "10:00", end: "19:00" },
          breaks: [{ start: "14:00", end: "15:00", label: "Lunch" }],
        },
        friday: {
          isOpen: true,
          hours: { start: "10:00", end: "17:00" },
          breaks: [{ start: "14:00", end: "15:00", label: "Lunch" }],
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
      id: "paula",
      slug: "paula-navarro",
      name: "Paula Navarro",
      photoUrl:
        "https://images.unsplash.com/photo-1580894732444-8ecded7900cd?auto=format&fit=crop&q=80&w=800",
      specialty: "Civil & Real Estate Law",
      bio: "Paula leads the civil practice at Meridian, advising on real estate transactions, inheritance disputes, and family law matters. Known for her strategic calm under pressure.",
      portfolio: [
        "https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&q=80&w=1200",
        "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&q=80&w=1200",
        "https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&q=80&w=1200",
        "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&q=80&w=1200",
      ],
      social: {
        twitter: "https://twitter.com/paulanavarro_es",
      },
      schedule: {
        monday: {
          isOpen: true,
          hours: { start: "09:00", end: "17:00" },
          breaks: [{ start: "13:30", end: "14:30", label: "Lunch" }],
        },
        tuesday: {
          isOpen: true,
          hours: { start: "09:00", end: "17:00" },
          breaks: [{ start: "13:30", end: "14:30", label: "Lunch" }],
        },
        wednesday: {
          isOpen: true,
          hours: { start: "09:00", end: "17:00" },
          breaks: [{ start: "13:30", end: "14:30", label: "Lunch" }],
        },
        thursday: {
          isOpen: true,
          hours: { start: "09:00", end: "17:00" },
          breaks: [{ start: "13:30", end: "14:30", label: "Lunch" }],
        },
        friday: {
          isOpen: true,
          hours: { start: "09:00", end: "15:00" },
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
  ],

  testimonials: [
    {
      name: "Carlos Díaz",
      title: "CEO, Díaz Capital",
      text: "Elena guided us through a complex M&A transaction with exceptional rigour and speed. Her advice was decisive at every critical juncture.",
      rating: 5,
    },
    {
      name: "Lucía Fernández",
      title: "HR Director, Group Industries",
      text: "Marcos is exactly what you want in an employment lawyer — sharp, calm, and always one step ahead. He saved the company from a major dispute.",
      rating: 5,
    },
    {
      name: "Roberto Iglesias",
      title: "Real Estate Investor",
      text: "Paula's handling of our portfolio restructuring was flawless. Her eye for detail and clear explanations made a complicated process feel manageable.",
      rating: 5,
    },
  ],

  gallery: [
    "https://images.unsplash.com/photo-1589994965851-a8f479c573a9?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1568992687947-868a62a9f521?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1521791055366-0d553872952f?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1551836022-deb4988cc6c0?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&q=80&w=1200",
  ],

  sections: {
    services: {
      title: "תחומי עיסוק",
      subtitle: "המומחיות שלנו",
      images: [
        "https://images.unsplash.com/photo-1589994965851-a8f479c573a9?auto=format&fit=crop&q=80&w=600",
        "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&q=80&w=600",
        "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?auto=format&fit=crop&q=80&w=600",
        "https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&q=80&w=600",
      ],
    },
    team: {
      title: "עורכי הדין שלנו",
      subtitle: "הכירו את הצוות",
      description:
        "קבוצה סלקטיבית של עורכי דין בכירים — ייעוץ אסטרטגי ומותאם אישית. לכל שותף עומק תחומי ומסלול תוצאות מוכח.",
    },
    whyChooseUs: {
      title: "מה מבדיל אותנו",
      subtitle: "למה Meridian",
      mainImage:
        "https://images.unsplash.com/photo-1521791055366-0d553872952f?auto=format&fit=crop&q=80&w=1000",
      badge: "20 שנה\nשל מצויינות",
      benefits: [
        {
          iconName: "Scale",
          title: "Proven Track Record",
          desc: "Over two decades of successful outcomes in corporate, labour and civil proceedings for clients across industries.",
        },
        {
          iconName: "ShieldCheck",
          title: "Absolute Confidentiality",
          desc: "Every matter is handled with the strictest professional privilege. Your information never leaves our secure perimeter.",
        },
        {
          iconName: "Clock",
          title: "Timely Response",
          desc: "We understand that legal matters are time-sensitive. Our team responds within 24 hours on business days.",
        },
        {
          iconName: "Users",
          title: "Boutique Attention",
          desc: "You always speak directly with a senior attorney. No associates handling your case without supervision.",
        },
      ],
    },
    testimonials: {
      title: "המלצות לקוחות",
      subtitle: "בשירות מובילים",
    },
    gallery: {
      title: "המשרדים שלנו",
      subtitle: "המשרד",
    },
    location: {
      title: "מיקום",
      subtitle: "בקרו במשרד",
    },
    contact: {
      title: "צור קשר",
      subtitle: "בקשת ייעוץ",
      description:
        "ספרו על הנושא המשפטי. עורך דין יבחן את הפנייה ויחזור תוך 24 שעות עסקים.",
    },
    booking: {
      title: "קביעת ייעוץ",
      tagline: "ייעוץ מדויק, מותאם לצורך",
      steps: {
        service: "תחום",
        staff: "עורך דין",
        datetime: "מועד",
        details: "אישור",
        payment: "תשלום",
      },
      aiConsultant: {
        title: "סינון משפטי חכם",
        subtitle: "לא בטוחים לאיזה תחום?",
        description:
          "תארו בקצרה את המצב והעוזר יפנה לעורך הדין המתאים.",
        agentLabel: "עוזר משפטי",
        placeholder:
          "תארו את המצב (למשל מחלוקת עם ספק על הפרת חוזה)...",
      },
      success: {
        title: "אושר",
        confirmed: "הייעוץ נקבע!",
        requestSaved: "הפנייה נשמרה!",
        cancelled: "בוטל",
      },
    },
    admin: {
      staff: {
        title: "ספר עורכי דין",
        scheduleTitle: "זמינות שבועית",
        commitButton: "שמירת זמינות",
        enforcementTitle: "אכיפת לוח זמנים",
        enforcementDesc:
          "זמינות עורכי הדין נאכפת בזמן אמת. שינויים נכנסים לתוקף מיד ומונעים כפילות בקביעות.",
      },
    },
  },
};
