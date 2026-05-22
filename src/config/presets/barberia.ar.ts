import type { NichePreset } from "../../types";
import { presetThemeBarberia } from "./themes";

export const barberiaPresetAr: NichePreset = {
  // لتفعيل وضع solo (عمل فردي)، غيّر إلى: businessMode: "solo",
  // وضع solo يحوّل قسم الفريق إلى "نبذة عنّي" ويتخطّى اختيار الحلّاق
  // عند الحجز (يُعيّن staff[0] تلقائيًا).
  businessMode: "team",
  business: {
    type: "barberia",
    legalName: "ONYX & STEEL GROOMING LLC",
    address:
      "123 Precision Way, Downtown Arts District, New York, NY 10012, United States",
    cancellationPolicy: "قبل 24 ساعة من موعد الحجز المحدّد",
  },

  brand: {
    name: "ONYX & STEEL",
    tagline: "ملاذ الرجل العصري",
    description:
      "وجهة فاخرة للعناية بالمظهر تجمع بين حِرفية عريقة ودقّة معاصرة. احجز تجربتك الاستثنائية.",
    logoIconName: "Scissors",
    faviconEmoji: "✂️",
    logoDark: "/logo-onyx-steel.svg",
    ogImage: "/og-opengraph-barber.png",
    aiPersona:
      "أنت مستشار افتراضي متخصّص في العناية الراقية بالرجال. مهمّتك توجيه العملاء بأسلوب أنيق، والإجابة عن أسئلتهم بإيجاز، وترشيح خدمات Onyx & Steel التي تناسب أسلوبهم الشخصي.",
  },

  theme: presetThemeBarberia,

  hero: {
    titlePrefix: "دقّة",
    titleHighlight: "مُتقَنة",
    titleSuffix: "للرجل العصري",
    subtitle:
      "حيث يصنع الحِرَفيّون الثقة في كل قصّة — عناية ترتقي إلى مستوى الفن الراقي.",
    ctaPrimary: "احجز كرسيك",
    ctaSecondary: "خدماتنا",
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
      name: "قصّة كلاسيكية",
      description:
        "قصّ دقيق مُصمَّم وفق هندسة وجهك، بمقصّ ياباني وتحديد بالموس، مع منتج تصفيف فاخر لإتمام المظهر.",
      duration: 30,
      price: 45,
    },
    {
      id: "beard-sculpt",
      name: "نحت اللحية",
      description:
        "تحديد بالمليمتر باستخدام الموس المستقيم، رسم الخطوط وبلسم مرطّب بزيت الأرغان. اللحية التي طالما استحققتها.",
      duration: 25,
      price: 35,
    },
    {
      id: "straight-shave",
      name: "حلاقة بالموس المستقيم",
      description:
        "طقس حلاقة كلاسيكي: تحضير بمنشفة ساخنة، رغوة خشب الصندل الفاخرة، وموس مستقيم من الفولاذ المقاوم. بشرة ناعمة كالحرير.",
      duration: 35,
      price: 40,
    },
    {
      id: "color-treatment",
      name: "صبغة وتلوين",
      description:
        "مزج الشيب أو تغطية كاملة بأصباغ فاخرة خالية من الأمونيا. نتيجة طبيعية تدوم طويلاً وجاهزة للكاميرا.",
      duration: 50,
      price: 65,
    },
    {
      id: "full-ritual",
      name: "الطقس الكامل",
      description:
        "تجربة Onyx & Steel المتكاملة: قصّة دقيقة، نحت لحية، منشفة ساخنة، وسيروم منعش للشعر.",
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
      specialty: "فيد كلاسيكي وقصّات متدرّجة",
      bio: "بخبرة تتجاوز 12 عامًا خلف الكرسي، يتقن Alex كامل طيف قصّات الفيد والأشكال الكلاسيكية — دقّة تجعل كل قصّة توقيعًا شخصيًا.",
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
          breaks: [{ start: "13:00", end: "14:00", label: "غداء" }],
        },
        tuesday: {
          isOpen: true,
          hours: { start: "09:00", end: "18:00" },
          breaks: [{ start: "13:00", end: "14:00", label: "غداء" }],
        },
        wednesday: {
          isOpen: true,
          hours: { start: "09:00", end: "18:00" },
          breaks: [{ start: "13:00", end: "14:00", label: "غداء" }],
        },
        thursday: {
          isOpen: true,
          hours: { start: "09:00", end: "18:00" },
          breaks: [{ start: "13:00", end: "14:00", label: "غداء" }],
        },
        friday: {
          isOpen: true,
          hours: { start: "09:00", end: "18:00" },
          breaks: [{ start: "13:00", end: "14:00", label: "غداء" }],
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
      specialty: "فنّ اللحية والعناية بالوجه",
      bio: "Daniel أستاذ في شعر الوجه. إتقانه للموس المستقيم ونحت اللحية جعله المرجع الأول في المدينة للحلاقة الرطبة الفاخرة.",
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
          breaks: [{ start: "14:00", end: "15:00", label: "استراحة" }],
        },
        wednesday: {
          isOpen: true,
          hours: { start: "10:00", end: "19:00" },
          breaks: [{ start: "14:00", end: "15:00", label: "استراحة" }],
        },
        thursday: {
          isOpen: true,
          hours: { start: "10:00", end: "19:00" },
          breaks: [{ start: "14:00", end: "15:00", label: "استراحة" }],
        },
        friday: {
          isOpen: true,
          hours: { start: "10:00", end: "19:00" },
          breaks: [{ start: "14:00", end: "15:00", label: "استراحة" }],
        },
        saturday: {
          isOpen: true,
          hours: { start: "10:00", end: "19:00" },
          breaks: [{ start: "14:00", end: "15:00", label: "استراحة" }],
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
      specialty: "عمل المقصّ والتكستشر",
      bio: "يدمج Michael تقنيات المقصّ الأوروبية مع أساليب التكستشر المعاصرة. النتيجة: إطلالات تبدو عفوية لكنها تعكس حضورًا لا يُنكَر.",
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
          breaks: [{ start: "12:00", end: "13:00", label: "غداء" }],
        },
        tuesday: {
          isOpen: true,
          hours: { start: "09:00", end: "17:00" },
          breaks: [{ start: "12:00", end: "13:00", label: "غداء" }],
        },
        wednesday: {
          isOpen: true,
          hours: { start: "09:00", end: "17:00" },
          breaks: [{ start: "12:00", end: "13:00", label: "غداء" }],
        },
        thursday: {
          isOpen: true,
          hours: { start: "09:00", end: "17:00" },
          breaks: [{ start: "12:00", end: "13:00", label: "غداء" }],
        },
        friday: {
          isOpen: true,
          hours: { start: "09:00", end: "17:00" },
          breaks: [{ start: "12:00", end: "13:00", label: "غداء" }],
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
      title: "مدير تنفيذي، TechSolutions",
      text: "الدقّة هنا في مستوى آخر. Alex قرأ هندسة وجهي قبل أن يمسك أي أداة. خرجت من الكرسي وكأنني شخص جديد.",
      rating: 5,
    },
    {
      name: "Julian Vane",
      title: "مهندس معماري",
      text: "حلاقة Daniel بالموس المستقيم أشبه بجلسة تأمّل. أنعم وأنظف حلاقة حصلت عليها منذ عشرين سنة. لن أذهب لمكان آخر.",
      rating: 5,
    },
    {
      name: "Elias Reed",
      title: "مصوّر",
      text: "أجواء داكنة، طاقة مركّزة، نتيجة عالمية. هكذا يجب أن يكون صالون الحلاقة. بلا استعراض — إتقان خالص.",
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
      title: "فنّ وحِرفة",
      subtitle: "خدمات فاخرة",
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
      title: "أساتذة المهنة",
      subtitle: "الحِرَفيّون",
      description:
        "مختارون بعناية لدقّتهم التقنية ورؤيتهم الفنّية والتزامهم المطلق بالمظهر الرجولي العصري. كل كرسي يشغله أستاذ.",
    },
    whyChooseUs: {
      title: "المعيار",
      subtitle: "لماذا تختارنا",
      mainImage:
        "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&q=80&w=1000",
      badge: "10 سنوات\nمن الإتقان",
      benefits: [
        {
          iconName: "ShieldCheck",
          title: "نظافة مطلقة",
          desc: "تعقيم بمعايير طبّية لجميع الأدوات بعد كل عميل. سلامتك معيار لا نساوم عليه.",
        },
        {
          iconName: "Clock",
          title: "التزام بالمواعيد",
          desc: "نحترم جدولك. نبدأ في الوقت المحدّد، كل مرّة. بلا انتظار وبلا أعذار.",
        },
        {
          iconName: "Award",
          title: "حِرفيّة عالية",
          desc: "فريقنا يخضع لتدريب مكثّف وشهادات معتمدة لإتقان كل تقنية ونوع شعر.",
        },
        {
          iconName: "Zap",
          title: "نتائج حادّة",
          desc: "الدقّة ليست هدفًا — إنها معيارنا. لا نتوقّف حتى يكون كل خط مثاليًا.",
        },
      ],
    },
    testimonials: {
      title: "أصوات الثقة",
      subtitle: "ماذا يقول عملاؤنا",
    },
    gallery: {
      title: "إبداع مرئي",
      subtitle: "معرض الأعمال",
    },
    location: {
      title: "زُرنا",
      subtitle: "اعثر على كرسيك",
    },
    contact: {
      title: "تواصل معنا",
      subtitle: "أرسل استفسارك",
      description:
        "لديك طلب خاص أو سؤال؟ راسلنا وسيردّ فريقنا بأسرع وقت.",
    },
    booking: {
      title: "حجز موعد",
      tagline: "تجربة ملاذ الرجل العصري",
      steps: {
        service: "الخدمة",
        staff: "الحِرَفي",
        datetime: "الموعد",
        details: "تأكيد",
        payment: "الدفع",
      },
      aiConsultant: {
        title: "ذكاء اصطناعي",
        subtitle: "تحتاج اقتراح لأسلوبك؟",
        description:
          "اسأل مستشارنا الذكي ليرشّح لك إطلالتك القادمة.",
        agentLabel: "المستشار الذكي",
        placeholder:
          "صِف رؤيتك (مثلاً: فيد منخفض مع لحية مدمجة وخط جانبي حاد)...",
      },
      success: {
        title: "تمّ",
        confirmed: "مؤكّد!",
        requestSaved: "تمّ حفظ الطلب!",
        cancelled: "مُلغى",
      },
    },
    instagram: {
      title: "تابع أعمالنا",
      handle: "@barbermaster",
      url: "https://instagram.com/barbermaster",
      images: [
        "https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=400&h=400&fit=crop",
        "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=400&h=400&fit=crop",
        "https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=400&h=400&fit=crop",
        "https://images.unsplash.com/photo-1622286342621-4bd786c2447c?w=400&h=400&fit=crop",
        "https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=400&h=400&fit=crop",
        "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop",
      ],
    },
    admin: {
      staff: {
        title: "دليل الفريق",
        scheduleTitle: "الجدول الأسبوعي",
        commitButton: "حفظ الجدول",
        enforcementTitle: "تطبيق الجدول",
        enforcementDesc:
          "جداول الفريق تُطبَّق فوريًا بواسطة محرّك الحجوزات. أي تعديل على ساعات العمل أو أيام الإغلاق يسري حالاً ويمنع الحجوزات المتضاربة.",
      },
    },
    faq: {
      title: "الأسئلة الشائعة",
      subtitle: "كل ما تحتاج معرفته قبل زيارتك",
      items: [
        { question: "هل أحتاج موعدًا مسبقًا؟", answer: "نرحّب بالحضور المباشر، لكننا ننصح بالحجز مسبقًا لضمان الوقت الذي يناسبك." },
        { question: "كم تستغرق القصّة؟", answer: "القصّة العادية تستغرق 30-45 دقيقة. تهذيب اللحية يضيف حوالي 15 دقيقة." },
        { question: "ما وسائل الدفع المتاحة؟", answer: "نقبل الدفع نقدًا، وبطاقات الائتمان، والدفع الرقمي." },
        { question: "هل يمكنني اختيار الحلّاق؟", answer: "بالتأكيد! اختر الحلّاق المفضّل عند الحجز إلكترونيًا أو أخبرنا عند وصولك." },
      ],
    },
  },
};
