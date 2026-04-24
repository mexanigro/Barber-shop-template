import type { NichePreset } from "../../types";

export const barberiaPresetHe: NichePreset = {
  business: {
    type: "barberia",
    legalName: "ONYX & STEEL GROOMING LLC",
    address:
      "רחוב Precision 123, אזור האמנות, ניו יורק, NY 10012, ארצות הברית",
    cancellationPolicy: "24 שעות לפני מועד התור שנקבע",
  },

  brand: {
    name: "ONYX & STEEL",
    tagline: "מקלט הג׳נטלמן המודרני",
    description:
      "יעד פרימיום להסתפרות וטיפוח — מסורת ומלאכה לצד דיוק עכשווי. הזמינו חוויה בלעדית.",
    logoIconName: "Scissors",
    ogImage: "/og-opengraph-barber.png",
    aiPersona:
      "אתם מומחה וירטואלי להסתפרות פרימיום לגבר. הנחיה אלגנטית, תשובות תמציתיות והמלצות לשירותים של Onyx & Steel שמתאימים לסגנון האישי של הלקוח.",
  },

  hero: {
    titlePrefix: "דיוק",
    titleHighlight: "מחושב",
    titleSuffix: "לגבר המודרני",
    subtitle:
      "אומנים מוסיפים ביטחון בכל תספורת — טיפוח ברמת מלאכת יד.",
    ctaPrimary: "שריינו את הכיסא",
    ctaSecondary: "השירותים שלנו",
    backgroundImage:
      "https://images.unsplash.com/photo-1532710093739-9470acff878f?auto=format&fit=crop&q=80&w=2000",
  },

  contact: {
    address: {
      street: "123 Precision Way",
      district: "Downtown Arts District",
      cityStateZip: "New York, NY 10012",
    },
    phone: "(555) 123-4567",
    email: "hello@onyxandsteel.com",
    social: {
      instagram: "https://instagram.com/onyxandsteel",
      facebook: "https://facebook.com/onyxandsteel",
      twitter: "https://twitter.com/onyxandsteel",
    },
  },

  hours: {
    monday: { start: "09:00", end: "20:00" },
    tuesday: { start: "09:00", end: "20:00" },
    wednesday: { start: "09:00", end: "20:00" },
    thursday: { start: "09:00", end: "20:00" },
    friday: { start: "09:00", end: "21:00" },
    saturday: { start: "10:00", end: "18:00" },
    sunday: null,
  },

  // ─── Services ────────────────────────────────────────────────────────────────
  // CRITICAL: services[i] maps 1:1 to sections.services.images[i].
  // If you add a service here, add its corresponding image below.
  services: [
    {
      id: "haircut",
      name: "תספורת קלאסית",
      description:
        "חיתוך מדויק למבנה הפנים, גימור בתער, ומוצר סטיילינג פרימיום.",
      duration: 30,
      price: 45,
    },
    {
      id: "beard-sculpt",
      name: "פיסול זקן",
      description:
        "קווים מושלמים בתער ישר, קונטור ומשחה לחות עם שמן ארגן.",
      duration: 25,
      price: 35,
    },
    {
      id: "straight-shave",
      name: "גילוח בתער קלאסי",
      description:
        "גילוח חם, קצף איכותי ותער פלדה — עור חלק ונעים.",
      duration: 35,
      price: 40,
    },
    {
      id: "color-treatment",
      name: "צבע והדגשות",
      description:
        "שיזוף אפור או צביעה מלאה עם פיגמנטים נטולי אמוניה — טבעי ועמיד.",
      duration: 50,
      price: 65,
    },
    {
      id: "full-ritual",
      name: "חוויית Ritual מלאה",
      description:
        "תספורת, זקן, מגבת חמה וסרום משקם — החוויה המלאה של Onyx & Steel.",
      duration: 75,
      price: 90,
    },
  ],

  staff: [
    {
      id: "alex",
      slug: "alex-reed",
      name: "Alex 'The Blade' Reed",
      // Avatar: professional barber in black apron inside barbershop
      photoUrl:
        "https://images.unsplash.com/photo-1717700921740-a1440f3b89a4?auto=format&fit=crop&q=80&w=800",
      specialty: "פייד קלאסי וצורות נקיות",
      bio: "מעל 12 שנות ניסיון במגוון פיידים וקווים קלאסיים — דיוק שהופך כל תספורת לחתימה אישית.",
      // Portfolio: finished haircut RESULTS only — no process shots, no capes
      portfolio: [
        "https://images.unsplash.com/photo-1568339434343-2a640a1a9946?auto=format&fit=crop&q=80&w=1200",
        "https://images.unsplash.com/photo-1618049049816-43a00d5b0c3d?auto=format&fit=crop&q=80&w=1200",
        "https://images.unsplash.com/photo-1456327102063-fb5054efe647?auto=format&fit=crop&q=80&w=1200",
        "https://images.unsplash.com/photo-1578390432942-d323db577792?auto=format&fit=crop&q=80&w=1200",
      ],
      social: {
        instagram: "https://instagram.com/alexblade",
        twitter: "https://twitter.com/alexblade",
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
          hours: { start: "09:00", end: "18:00" },
          breaks: [{ start: "13:00", end: "14:00", label: "צהריים" }],
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
      id: "daniel",
      slug: "daniel-petrocelli",
      name: "Daniel Petrocelli",
      // Avatar: urban barber with apron and tattoo on arm
      photoUrl:
        "https://images.unsplash.com/photo-1723021073699-77f5442510a2?auto=format&fit=crop&q=80&w=800",
      specialty: "אומנות זקן וטיפוח פנים",
      bio: "שליטה בתער ובקונטור זקן — מהמובילים בעיר בגילוח רטוב יוקרתי.",
      // Portfolio: finished beard RESULTS only — sculpted beards, clean lines
      portfolio: [
        "https://images.unsplash.com/photo-1657105052388-e839d5d0f395?auto=format&fit=crop&q=80&w=1200",
        "https://images.unsplash.com/photo-1659212165922-b1b64fc04ccf?auto=format&fit=crop&q=80&w=1200",
        "https://images.unsplash.com/photo-1674456483643-05448d24cd77?auto=format&fit=crop&q=80&w=1200",
        "https://images.unsplash.com/photo-1551810104-58185e8cfd0c?auto=format&fit=crop&q=80&w=1200",
      ],
      social: {
        instagram: "https://instagram.com/danielgrooming",
      },
      schedule: {
        monday: {
          isOpen: false,
          hours: { start: "00:00", end: "00:00" },
          breaks: [],
        },
        tuesday: {
          isOpen: true,
          hours: { start: "10:00", end: "19:00" },
          breaks: [{ start: "14:00", end: "15:00", label: "הפסקה" }],
        },
        wednesday: {
          isOpen: true,
          hours: { start: "10:00", end: "19:00" },
          breaks: [{ start: "14:00", end: "15:00", label: "הפסקה" }],
        },
        thursday: {
          isOpen: true,
          hours: { start: "10:00", end: "19:00" },
          breaks: [{ start: "14:00", end: "15:00", label: "הפסקה" }],
        },
        friday: {
          isOpen: true,
          hours: { start: "10:00", end: "19:00" },
          breaks: [{ start: "14:00", end: "15:00", label: "הפסקה" }],
        },
        saturday: {
          isOpen: true,
          hours: { start: "10:00", end: "19:00" },
          breaks: [{ start: "14:00", end: "15:00", label: "הפסקה" }],
        },
        sunday: {
          isOpen: false,
          hours: { start: "00:00", end: "00:00" },
          breaks: [],
        },
      },
    },
    {
      id: "michael",
      slug: "michael-vane",
      name: "Michael Vane",
      // Avatar: barber in black long sleeve shirt, barbershop setting
      photoUrl:
        "https://images.unsplash.com/photo-1619233543112-fe382ff3693d?auto=format&fit=crop&q=80&w=800",
      specialty: "עבודת מספריים ומרקם",
      bio: "משלב טכניקות אירופיות עם טקסטורה עכשווית — סגנון שלא מתאמץ ומשדר סמכות.",
      // Portfolio: finished textured cut RESULTS only — no process shots
      portfolio: [
        "https://images.unsplash.com/photo-1587776535733-b4c80a99ef82?auto=format&fit=crop&q=80&w=1200",
        "https://images.unsplash.com/photo-1584864650621-95648f07518e?auto=format&fit=crop&q=80&w=1200",
        "https://images.unsplash.com/photo-1648742468740-6347e05c7faa?auto=format&fit=crop&q=80&w=1200",
        "https://images.unsplash.com/photo-1516646720587-727f6728837d?auto=format&fit=crop&q=80&w=1200",
      ],
      social: {
        instagram: "https://instagram.com/michaelvane",
        twitter: "https://twitter.com/michaelvane",
      },
      schedule: {
        monday: {
          isOpen: true,
          hours: { start: "09:00", end: "17:00" },
          breaks: [{ start: "12:00", end: "13:00", label: "צהריים" }],
        },
        tuesday: {
          isOpen: true,
          hours: { start: "09:00", end: "17:00" },
          breaks: [{ start: "12:00", end: "13:00", label: "צהריים" }],
        },
        wednesday: {
          isOpen: true,
          hours: { start: "09:00", end: "17:00" },
          breaks: [{ start: "12:00", end: "13:00", label: "צהריים" }],
        },
        thursday: {
          isOpen: true,
          hours: { start: "09:00", end: "17:00" },
          breaks: [{ start: "12:00", end: "13:00", label: "צהריים" }],
        },
        friday: {
          isOpen: true,
          hours: { start: "09:00", end: "17:00" },
          breaks: [{ start: "12:00", end: "13:00", label: "צהריים" }],
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
      name: "Marcus Thorne",
      title: "מנכ״ל, TechSolutions",
      text: "הדיוק כאן בשחק אחר. אלקס קרא את הגאומטריה של הפנים לפני שנגע במספריים. יצאתי כמו אדם אחר.",
      rating: 5,
    },
    {
      name: "Julian Vane",
      title: "אדריכל",
      text: "הגילוח בתער של דניאל כמו מדיטציה — החלק והנקי ביותר בעשרים שנה.",
      rating: 5,
    },
    {
      name: "Elias Reed",
      title: "צלם",
      text: "אווירה כהה, פוקוס, תוצאה מהשורה הראשונה — בדיוק מה שצריך ממספרה.",
      rating: 5,
    },
  ],

  // ─── Gallery ─────────────────────────────────────────────────────────────────
  // 12 curated result-only shots: clean fades, textured styles, sculpted beards.
  // Rule: NO process shots, NO scissors/clippers in frame, NO capes on clients.
  gallery: [
    "https://images.unsplash.com/photo-1568339434343-2a640a1a9946?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1618049049816-43a00d5b0c3d?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1456327102063-fb5054efe647?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1578390432942-d323db577792?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1657105052388-e839d5d0f395?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1659212165922-b1b64fc04ccf?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1674456483643-05448d24cd77?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1551810104-58185e8cfd0c?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1587776535733-b4c80a99ef82?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1584864650621-95648f07518e?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1648742468740-6347e05c7faa?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1516646720587-727f6728837d?auto=format&fit=crop&q=80&w=1200",
  ],

  sections: {
    services: {
      title: "אומנות ומלאכה",
      subtitle: "שירותים פרימיום",
      // ACTION shots — one per service, same order as services[].
      // Rule: each image must show the barber actively performing that specific service.
      // services[0] Classic Haircut       → barber in white shirt cutting client's hair
      // services[1] Beard Sculpture       → barber detailing / sculpting a beard
      // services[2] Straight Razor Shave  → straight-razor shave in progress
      // services[3] Color & Tint          → barber applying hair color treatment
      // services[4] The Full Ritual       → client receiving full barbershop session
      images: [
        "https://images.unsplash.com/photo-1593702275687-f8b402bf1fb5?auto=format&fit=crop&q=80&w=600",
        "https://images.unsplash.com/photo-1621605815971-fbc98d665033?auto=format&fit=crop&q=80&w=600",
        "https://images.unsplash.com/photo-1761148438883-e34e0289a214?auto=format&fit=crop&q=80&w=600",
        "https://images.unsplash.com/photo-1634449571010-02389ed0f9b0?auto=format&fit=crop&q=80&w=600",
        "https://images.unsplash.com/photo-1654097800183-574ba7368f74?auto=format&fit=crop&q=80&w=600",
      ],
    },
    team: {
      title: "אומני המקצוע",
      subtitle: "האומנים",
      description:
        "נבחרים בקפידה לדיוק טכני, חזון צורני ומחויבות לקו הגברי המודרני. בכל כיסא יושב אמן.",
    },
    whyChooseUs: {
      title: "הסטנדרט",
      subtitle: "למה לבחור בנו",
      mainImage:
        "https://images.unsplash.com/photo-1512690196236-724d90957dc3?auto=format&fit=crop&q=80&w=1000",
      badge: "10 שנים\nשל שליטה",
      benefits: [
        {
          iconName: "ShieldCheck",
          title: "היגיינה מוחלטת",
          desc: "חיטוי ברמה רפואית אחרי כל לקוח — הבטיחות שלכם לא למו״מ.",
        },
        {
          iconName: "Clock",
          title: "דיוק בזמנים",
          desc: "מכבדים את היומן שלכם — מתחילים בזמן, בלי תורים מיותרים.",
        },
        {
          iconName: "Award",
          title: "מלאכת מופת",
          desc: "הצוות מתאמן ומתעדכן כדי לשלוט בכל טכניקה וסוג שיער.",
        },
        {
          iconName: "Zap",
          title: "קווים חדים",
          desc: "דיוק הוא לא יעד — הוא תקן. לא עוצרים עד שהכל מושלם.",
        },
      ],
    },
    testimonials: {
      title: "קולות של אמון",
      subtitle: "מה הלקוחות אומרים",
    },
    gallery: {
      title: "שליטה ויזואלית",
      subtitle: "תיק עבודות",
    },
    location: {
      title: "בואו לבקר",
      subtitle: "מצאו את הכיסא",
    },
    contact: {
      title: "צרו קשר",
      subtitle: "שלחו פנייה",
      description:
        "בקשה מיוחדת או שאלה? כתבו לנו והצוות יחזור מהר.",
    },
    booking: {
      title: "קביעת תור",
      tagline: "חוויית הג׳נטלמן המודרני",
      steps: {
        service: "שירות",
        staff: "אומן",
        datetime: "מועד",
        details: "אישור",
        payment: "תשלום",
      },
      aiConsultant: {
        title: "ייעוץ חכם",
        subtitle: "רוצים דיוק בסגנון?",
        description:
          "שאלו את המומחה המומלץ לאיך תיראה הפעם הבאה שלכם בכיסא.",
        agentLabel: "סוכן ייעוץ",
        placeholder:
          "תארו את החזון (למשל: פייד נמוך, זקן מעודן, חלוקה קשיחה)...",
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
        scheduleTitle: "חלון זמינות שבועי",
        commitButton: "שמירת לוח זמנים",
        enforcementTitle: "אכיפת לוח זמנים",
        enforcementDesc:
          "לוחות הצוות נאכפים במנוע ההזמנות. שינויים מתעדכנים מיד ומונעים תורים בלתי אפשריים.",
      },
    },
  },
};
