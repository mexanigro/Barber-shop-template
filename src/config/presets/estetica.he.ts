import type { NichePreset } from "../../types";
import { presetThemeEstetica } from "./themes";

export const esteticaPresetHe: NichePreset = {
  business: {
    type: "estetica",
    legalName: "LUMINA AESTHETIC STUDIO SL",
    address:
      "45 Boulevard de la Beauté, Zona Alta, Barcelona, 08006, España",
    cancellationPolicy: "48 שעות לפני תחילת הטיפול",
  },

  brand: {
    name: "LUMINA STUDIO",
    tagline: "המדע נפגש ביופי",
    description:
      "טיפולי אסתטיקה מדויקים בסביבה קלינית פרימיום. מומחים מוסמכים, טכנולוגיה מתקדמת, פרוטוקולים אישיים.",
    logoIconName: "Sparkles",
    aiPersona:
      "את יועצת וירטואלית מומחית באסתטיקה מתקדמת וטיפולי פנים. הנחי אדיבה, מענה לשאלות והמלצה לטיפול המתאים ביותר.",
  },

  theme: presetThemeEstetica,

  hero: {
    titlePrefix: "תוצאות",
    titleHighlight: "קורנות",
    titleSuffix: "מעוצבות עבורך",
    subtitle:
      "טיפולי אסתטיקה מתקדמים אצל מומחים מוסמכים. מקסימום פוטנציאל לעור עם פרוטוקולים מבוססי מחקר.",
    ctaPrimary: "קבעי ייעוץ",
    ctaSecondary: "הטיפולים שלנו",
    backgroundImage:
      "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&q=80&w=2000",
  },

  contact: {
    address: {
      street: "45 Boulevard de la Beauté",
      district: "Zona Alta",
      cityStateZip: "Barcelona, 08006",
    },
    phone: "+34 93 456 7890",
    email: "hello@luminastudio.com",
    social: {
      instagram: "https://instagram.com/luminastudio",
      facebook: "https://facebook.com/luminastudio",
    },
  },

  hours: {
    monday: { start: "10:00", end: "20:00" },
    tuesday: { start: "10:00", end: "20:00" },
    wednesday: { start: "10:00", end: "20:00" },
    thursday: { start: "10:00", end: "20:00" },
    friday: { start: "10:00", end: "20:00" },
    saturday: { start: "10:00", end: "16:00" },
    sunday: null,
  },

  services: [
    {
      id: "hydrafacial",
      name: "HydraFacial MD",
      description:
        "Deep cleansing, exfoliation, extraction, and intense hydration in a single premium session.",
      duration: 60,
      price: 120,
    },
    {
      id: "botox",
      name: "Botulinum Toxin",
      description:
        "Expression line smoothing with medical-grade botulinum toxin. Natural results, zero downtime.",
      duration: 30,
      price: 250,
    },
    {
      id: "filler",
      name: "Hyaluronic Filler",
      description:
        "Volume restoration and contour definition with premium hyaluronic acid. Immediate effect.",
      duration: 45,
      price: 320,
    },
    {
      id: "laser",
      name: "Laser Hair Removal",
      description:
        "Permanent reduction with Diode 808 nm technology. Effective on all phototypes.",
      duration: 45,
      price: 90,
    },
  ],

  staff: [
    {
      id: "sofia",
      slug: "sofia-montero",
      name: "Dr. Sofía Montero",
      photoUrl:
        "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=800",
      specialty: "Medical Aesthetics & Injectables",
      bio: "Dr. Montero holds a degree in Medicine specialised in Aesthetic Medicine. With 8 years of experience, she leads injectable treatments with a natural, personalised approach.",
      portfolio: [
        "https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&q=80&w=1200",
        "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&q=80&w=1200",
        "https://images.unsplash.com/photo-1512290923902-8a9f81dc236c?auto=format&fit=crop&q=80&w=1200",
        "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&q=80&w=1200",
      ],
      social: {
        instagram: "https://instagram.com/drasofiamontero",
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
          isOpen: true,
          hours: { start: "10:00", end: "19:00" },
          breaks: [{ start: "14:00", end: "15:00", label: "Lunch" }],
        },
        thursday: {
          isOpen: true,
          hours: { start: "10:00", end: "19:00" },
          breaks: [{ start: "14:00", end: "15:00", label: "Lunch" }],
        },
        friday: {
          isOpen: true,
          hours: { start: "10:00", end: "19:00" },
          breaks: [{ start: "14:00", end: "15:00", label: "Lunch" }],
        },
        saturday: {
          isOpen: true,
          hours: { start: "10:00", end: "14:00" },
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
      id: "clara",
      slug: "clara-vidal",
      name: "Clara Vidal",
      photoUrl:
        "https://images.unsplash.com/photo-1594744803329-e58b31de8bf5?auto=format&fit=crop&q=80&w=800",
      specialty: "Advanced Facial & HydraFacial",
      bio: "Clara is a certified clinical aesthetician with expertise in advanced facials and skin-health protocols. She brings a meticulous and calming approach to each session.",
      portfolio: [
        "https://images.unsplash.com/photo-1616394584738-fc6e612e71b9?auto=format&fit=crop&q=80&w=1200",
        "https://images.unsplash.com/photo-1601049541271-70d659f88be8?auto=format&fit=crop&q=80&w=1200",
        "https://images.unsplash.com/photo-1515377905703-c4788e51af15?auto=format&fit=crop&q=80&w=1200",
        "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&q=80&w=1200",
      ],
      social: {
        instagram: "https://instagram.com/claravidal_skin",
      },
      schedule: {
        monday: {
          isOpen: false,
          hours: { start: "00:00", end: "00:00" },
          breaks: [],
        },
        tuesday: {
          isOpen: true,
          hours: { start: "11:00", end: "20:00" },
          breaks: [{ start: "15:00", end: "16:00", label: "Break" }],
        },
        wednesday: {
          isOpen: true,
          hours: { start: "11:00", end: "20:00" },
          breaks: [{ start: "15:00", end: "16:00", label: "Break" }],
        },
        thursday: {
          isOpen: true,
          hours: { start: "11:00", end: "20:00" },
          breaks: [{ start: "15:00", end: "16:00", label: "Break" }],
        },
        friday: {
          isOpen: true,
          hours: { start: "11:00", end: "20:00" },
          breaks: [{ start: "15:00", end: "16:00", label: "Break" }],
        },
        saturday: {
          isOpen: true,
          hours: { start: "10:00", end: "16:00" },
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
      id: "leo",
      slug: "leo-ferrer",
      name: "Leo Ferrer",
      photoUrl:
        "https://images.unsplash.com/photo-1582750433449-648ed127bb54?auto=format&fit=crop&q=80&w=800",
      specialty: "Laser Treatments & Body Care",
      bio: "Leo specialises in laser technology and body contouring. Certified in multiple laser platforms, he delivers precise, safe results with every session.",
      portfolio: [
        "https://images.unsplash.com/photo-1612817288484-6f916006741a?auto=format&fit=crop&q=80&w=1200",
        "https://images.unsplash.com/photo-1583772096048-47cb5ca30a6f?auto=format&fit=crop&q=80&w=1200",
        "https://images.unsplash.com/photo-1560472355-536de3962603?auto=format&fit=crop&q=80&w=1200",
        "https://images.unsplash.com/photo-1631217868264-e5b90bb7e133?auto=format&fit=crop&q=80&w=1200",
      ],
      social: {
        instagram: "https://instagram.com/leoferrer_laser",
        twitter: "https://twitter.com/leoferrer",
      },
      schedule: {
        monday: {
          isOpen: true,
          hours: { start: "10:00", end: "18:00" },
          breaks: [{ start: "13:00", end: "14:00", label: "Lunch" }],
        },
        tuesday: {
          isOpen: true,
          hours: { start: "10:00", end: "18:00" },
          breaks: [{ start: "13:00", end: "14:00", label: "Lunch" }],
        },
        wednesday: {
          isOpen: true,
          hours: { start: "10:00", end: "18:00" },
          breaks: [{ start: "13:00", end: "14:00", label: "Lunch" }],
        },
        thursday: {
          isOpen: true,
          hours: { start: "10:00", end: "18:00" },
          breaks: [{ start: "13:00", end: "14:00", label: "Lunch" }],
        },
        friday: {
          isOpen: true,
          hours: { start: "10:00", end: "18:00" },
          breaks: [{ start: "13:00", end: "14:00", label: "Lunch" }],
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
      name: "Valentina Cruz",
      title: "Art Director",
      text: "Dr. Montero completely transformed my skin. The botox results are so natural that no one believes I had anything done — that's the highest compliment.",
      rating: 5,
    },
    {
      name: "Isabelle Moreau",
      title: "Fashion Consultant",
      text: "Clara's HydraFacial is nothing short of magical. I left with the most luminous skin of my life. I'm now a monthly regular.",
      rating: 5,
    },
    {
      name: "Natalia Ortiz",
      title: "Entrepreneur",
      text: "The clinic is impeccable — sterile, elegant, and the team is incredibly professional. Leo's laser work is fast, painless, and highly effective.",
      rating: 5,
    },
  ],

  gallery: [
    "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1616394584738-fc6e612e71b9?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1512290923902-8a9f81dc236c?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1601049541271-70d659f88be8?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1515377905703-c4788e51af15?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1612817288484-6f916006741a?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1560472355-536de3962603?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1631217868264-e5b90bb7e133?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1583772096048-47cb5ca30a6f?auto=format&fit=crop&q=80&w=1200",
  ],

  sections: {
    services: {
      title: "פרוטוקולים מדויקים",
      subtitle: "הטיפולים שלנו",
      images: [
        "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&q=80&w=600",
        "https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&q=80&w=600",
        "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&q=80&w=600",
        "https://images.unsplash.com/photo-1512290923902-8a9f81dc236c?auto=format&fit=crop&q=80&w=600",
      ],
    },
    team: {
      title: "המומחים שלנו",
      subtitle: "ידיים מקצועיות",
      description:
        "צוות רפואי-אסתטי מוסמך — ניסיון קליני, הכשרה מתמשכת ותשוקה לתוצאות מבוססות מחקר.",
    },
    whyChooseUs: {
      title: "המחויבות שלנו",
      subtitle: "למה Lumina",
      mainImage:
        "https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&q=80&w=1000",
      badge: "מצויינות\nמוסמכת",
      benefits: [
        {
          iconName: "ShieldCheck",
          title: "Clinical Safety",
          desc: "All procedures comply with EU medical standards. Sterile protocols and CE-certified equipment on every session.",
        },
        {
          iconName: "Microscope",
          title: "Evidence-Based",
          desc: "We only offer treatments with proven clinical efficacy. No trends — only science-backed protocols.",
        },
        {
          iconName: "Award",
          title: "Certified Specialists",
          desc: "Our team holds advanced degrees and regularly attend international congresses to stay at the forefront.",
        },
        {
          iconName: "HeartHandshake",
          title: "Personalised Care",
          desc: "Every client receives a bespoke protocol. We listen, assess, and design the treatment plan that fits you.",
        },
      ],
    },
    testimonials: {
      title: "תוצאות לקוחות",
      subtitle: "מה הן אומרות",
    },
    gallery: {
      title: "לפני ואחרי",
      subtitle: "תוצאות אמיתיות",
    },
    location: {
      title: "מצאו אותנו",
      subtitle: "בקרו בסטודיו",
    },
    contact: {
      title: "צרו קשר",
      subtitle: "ייעוץ ללא עלות",
      description:
        "לא בטוחות איזה טיפול מתאים? כתבו לנו ומומחה תלווה אתכן צעד אחר צעד.",
    },
    booking: {
      title: "קביעת טיפול",
      tagline: "אסתטיקה מדויקת, מותאמת אישית",
      steps: {
        service: "טיפול",
        staff: "מומחה",
        datetime: "מועד",
        details: "אישור",
        payment: "תשלום",
      },
      aiConsultant: {
        title: "יועצת עור חכמה",
        subtitle: "לא יודעות מאיפה להתחיל?",
        description:
          "תארו את הבעיה והיועצת תציע את הטיפול המתאים ביותר.",
        agentLabel: "יועצת עור",
        placeholder:
          "תארו את החשש (קמטוטים, יובש, כתמים)...",
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
        title: "צוות מומחים",
        scheduleTitle: "זמינות שבועית",
        commitButton: "שמירת לוח זמנים",
        enforcementTitle: "אכיפת זמינות",
        enforcementDesc:
          "לוחות המומחים נאכפים בזמן אמת. שינויים מתעדכנים מיד ומונעים כפילות בתורים.",
      },
    },
  },
};
