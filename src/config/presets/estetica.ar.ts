import type { NichePreset } from "../../types";
import { presetThemeEstetica } from "./themes";

export const esteticaPresetAr: NichePreset = {
  businessMode: "team",
  business: {
    type: "estetica",
    legalName: "LUMIÈRE CLINIC LLC",
    address:
      "820 Park Avenue, Suite 4A, Upper East Side, New York, NY 10021, United States",
    cancellationPolicy: "قبل 24 ساعة من موعد الجلسة",
  },

  brand: {
    name: "LUMIÈRE CLINIC",
    tagline: "علم الجمال الطبيعي",
    description:
      "عيادة طب تجميلي متخصصة في الحقن التجميلية، علاجات البشرة المتقدمة، وتجديد الجلد. أطباء معتمدون، منتجات حاصلة على موافقة FDA، وبروتوكولات علاجية مصممة خصيصاً لكل حالة.",
    logoIconName: "Sparkles",
    faviconEmoji: "✨",
    ogImage: "/og-opengraph-barber.png",
    aiPersona:
      "أنت مستشار بشرة افتراضي في عيادة طب تجميلي فاخرة. ساعد العملاء بدفء واحترافية طبية، أجب عن أسئلتهم حول الحقن التجميلية والعناية بالبشرة، واقترح العلاج الأنسب لاحتياجاتهم.",
  },

  theme: presetThemeEstetica,

  hero: {
    titlePrefix: "علم",
    titleHighlight: "الجمال",
    titleSuffix: "الطبيعي",
    subtitle:
      "أخصائيون معتمدون. منتجات حاصلة على موافقة FDA. رحلتك تبدأ باستشارة مجانية بدون أي التزام.",
    ctaPrimary: "احجز استشارة مجانية",
    ctaSecondary: "استعرض العلاجات",
    backgroundImage:
      "https://images.unsplash.com/photo-1552693673-1bf958298935?auto=format&fit=crop&q=80&w=2000",
  },

  contact: {
    address: {
      street: "820 Park Avenue, Suite 4A",
      district: "Upper East Side",
      cityStateZip: "New York, NY 10021",
    },
    phone: "(212) 555-0194",
    email: "hello@lumiereclinic.com",
    social: {
      instagram: "https://instagram.com/lumiereclinic",
      facebook: "https://facebook.com/lumiereclinic",
    },
  },

  hours: {
    monday: { start: "09:00", end: "18:00" },
    tuesday: { start: "09:00", end: "18:00" },
    wednesday: { start: "09:00", end: "18:00" },
    thursday: { start: "09:00", end: "18:00" },
    friday: { start: "09:00", end: "18:00" },
    saturday: { start: "09:00", end: "14:00" },
    sunday: null,
  },

  // ─── Services ────────────────────────────────────────────────────────────────
  // CRITICAL: services[i] maps 1:1 to sections.services.images[i].
  // If you add a service here, add its corresponding image below.
  services: [
    {
      id: "lip-filler",
      name: "فيلر الشفاه",
      description:
        "حجم طبيعي وتحديد دقيق باستخدام حمض الهيالورونيك الفاخر. نتائج فورية بملمس طبيعي وبدون فترة تعافي.",
      duration: 45,
      price: 450,
    },
    {
      id: "cheek-filler",
      name: "فيلر الخدود وخط الفك",
      description:
        "نحت بنيوي باستخدام حمض الهيالورونيك المتشابك. يعيد الحجم، يرفع، ويحدّد منطقة منتصف الوجه بدقة متناهية.",
      duration: 50,
      price: 550,
    },
    {
      id: "botox",
      name: "بوتوكس",
      description:
        "معالج عصبي معتمد من FDA لخطوط التعبير — الجبهة، خطوط حول العينين، وخطوط العبوس. نتائج طبيعية ودقيقة بدون فترة تعافي.",
      duration: 30,
      price: 350,
    },
    {
      id: "facial",
      name: "فيشل متقدم",
      description:
        "جلسة عناية سريرية مصممة خصيصاً تجمع بين التنظيف العميق، التقشير الطبي، وسيرومات مستهدفة. إشراقة فورية.",
      duration: 60,
      price: 195,
    },
    {
      id: "skin-booster",
      name: "سكن بوستر",
      description:
        "حقن دقيقة من حمض الهيالورونيك غير المتشابك لترطيب عميق، تحسين المرونة، واستعادة النضارة من الداخل.",
      duration: 45,
      price: 500,
    },
  ],

  staff: [
    {
      id: "dr-anika",
      slug: "dr-anika-chen",
      name: "Dr. Anika Chen",
      photoUrl:
        "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=800",
      specialty: "طب التجميل والحقن",
      bio: "طبيبة معتمدة في طب التجميل مع أكثر من 10 سنوات خبرة في حقن الوجه. تشتهر د. Chen بفلسفتها 'الأقل هو الأجمل' — تعزيز الملامح الطبيعية دون تغيير الهوية.",
      portfolio: [
        "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&q=80&w=1200",
        "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&q=80&w=1200",
        "https://images.unsplash.com/photo-1666214280557-f1b5022eb634?auto=format&fit=crop&q=80&w=1200",
        "https://images.unsplash.com/photo-1516975080664-ed2fc6a32937?auto=format&fit=crop&q=80&w=1200",
      ],
      social: {
        instagram: "https://instagram.com/dranikachen",
      },
      schedule: {
        monday: {
          isOpen: true,
          hours: { start: "09:00", end: "18:00" },
          breaks: [{ start: "13:00", end: "14:00", label: "استراحة" }],
        },
        tuesday: {
          isOpen: true,
          hours: { start: "09:00", end: "18:00" },
          breaks: [{ start: "13:00", end: "14:00", label: "استراحة" }],
        },
        wednesday: {
          isOpen: true,
          hours: { start: "09:00", end: "18:00" },
          breaks: [{ start: "13:00", end: "14:00", label: "استراحة" }],
        },
        thursday: {
          isOpen: true,
          hours: { start: "09:00", end: "18:00" },
          breaks: [{ start: "13:00", end: "14:00", label: "استراحة" }],
        },
        friday: {
          isOpen: true,
          hours: { start: "09:00", end: "18:00" },
          breaks: [{ start: "13:00", end: "14:00", label: "استراحة" }],
        },
        saturday: {
          isOpen: true,
          hours: { start: "09:00", end: "14:00" },
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
      id: "maya",
      slug: "maya-torres",
      name: "Maya Torres",
      photoUrl:
        "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&q=80&w=800",
      specialty: "العناية المتقدمة بالبشرة",
      bio: "أخصائية تجميل طبي مرخصة بشهادة مزدوجة في العناية السريرية بالبشرة والتقشير الكيميائي. Maya تصمم كل جلسة كبروتوكول علاجي — منهجي، مبني على أدلة علمية، ومصمم وفقاً لحالة بشرتك الحالية.",
      portfolio: [
        "https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&q=80&w=1200",
        "https://images.unsplash.com/photo-1512290923902-8a9f81dc236c?auto=format&fit=crop&q=80&w=1200",
        "https://images.unsplash.com/photo-1515377905703-c4788e51af15?auto=format&fit=crop&q=80&w=1200",
        "https://images.unsplash.com/photo-1596178065887-1198b6148b2b?auto=format&fit=crop&q=80&w=1200",
      ],
      social: {
        instagram: "https://instagram.com/mayatorres_skin",
      },
      schedule: {
        monday: {
          isOpen: false,
          hours: { start: "00:00", end: "00:00" },
          breaks: [],
        },
        tuesday: {
          isOpen: true,
          hours: { start: "10:00", end: "18:00" },
          breaks: [{ start: "13:30", end: "14:30", label: "استراحة" }],
        },
        wednesday: {
          isOpen: true,
          hours: { start: "10:00", end: "18:00" },
          breaks: [{ start: "13:30", end: "14:30", label: "استراحة" }],
        },
        thursday: {
          isOpen: true,
          hours: { start: "10:00", end: "18:00" },
          breaks: [{ start: "13:30", end: "14:30", label: "استراحة" }],
        },
        friday: {
          isOpen: true,
          hours: { start: "10:00", end: "18:00" },
          breaks: [{ start: "13:30", end: "14:30", label: "استراحة" }],
        },
        saturday: {
          isOpen: true,
          hours: { start: "09:00", end: "14:00" },
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
      name: "David Park, RN",
      photoUrl:
        "https://images.unsplash.com/photo-1582750433449-648ed127bb54?auto=format&fit=crop&q=80&w=800",
      specialty: "أخصائي حقن وسكن بوستر",
      bio: "ممرض مرخص بتدريب متقدم في الفيلر وبروتوكولات سكن بوستر. David يجمع بين الدقة السريرية والعين الفنية لتناسق الوجه وتناسبه.",
      portfolio: [
        "https://images.unsplash.com/photo-1573461160327-b450ce3d8e7f?auto=format&fit=crop&q=80&w=1200",
        "https://images.unsplash.com/photo-1522337094846-8a818192de1f?auto=format&fit=crop&q=80&w=1200",
        "https://images.unsplash.com/photo-1505944270255-72b8c68c6a70?auto=format&fit=crop&q=80&w=1200",
        "https://images.unsplash.com/photo-1616394584738-fc6e612e71b9?auto=format&fit=crop&q=80&w=1200",
      ],
      social: {
        instagram: "https://instagram.com/davidpark_aesthetics",
      },
      schedule: {
        monday: {
          isOpen: true,
          hours: { start: "09:00", end: "17:00" },
          breaks: [{ start: "12:30", end: "13:30", label: "استراحة" }],
        },
        tuesday: {
          isOpen: true,
          hours: { start: "09:00", end: "17:00" },
          breaks: [{ start: "12:30", end: "13:30", label: "استراحة" }],
        },
        wednesday: {
          isOpen: true,
          hours: { start: "09:00", end: "17:00" },
          breaks: [{ start: "12:30", end: "13:30", label: "استراحة" }],
        },
        thursday: {
          isOpen: true,
          hours: { start: "09:00", end: "17:00" },
          breaks: [{ start: "12:30", end: "13:30", label: "استراحة" }],
        },
        friday: {
          isOpen: true,
          hours: { start: "09:00", end: "17:00" },
          breaks: [{ start: "12:30", end: "13:30", label: "استراحة" }],
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
      name: "Rachel Kim",
      title: "مديرة تسويق",
      text: "كنت خائفة أن أبدو 'مبالغ فيها'. د. Chen طمأنتني تماماً والنتائج طبيعية جداً — صديقاتي يقولون فقط أنني أبدو مرتاحة. وهذا بالضبط ما أردته.",
      rating: 5,
    },
    {
      name: "Gabriella Santos",
      title: "مصممة ديكور",
      text: "جلسات Maya هي الوحيدة التي غيّرت بشرتي فعلاً على المدى الطويل. بعد ثلاث جلسات، ملمس بشرتي ولونها تغيّرا كلياً. أنا مقتنعة تماماً.",
      rating: 5,
    },
    {
      name: "Lauren Whitfield",
      title: "محامية",
      text: "نظافة، هدوء، احترافية. بدون ضغط أو محاولة بيع زائدة. David شرح كل خطوة قبل لمس وجهي. نتيجة فيلر الشفاه دقيقة ومثالية.",
      rating: 5,
    },
  ],

  // ─── Gallery ─────────────────────────────────────────────────────────────────
  // 12 curated clinical aesthetics images: treatments, results, clinic environment.
  gallery: [
    "https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1666214280557-f1b5022eb634?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1512290923902-8a9f81dc236c?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1516975080664-ed2fc6a32937?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1573461160327-b450ce3d8e7f?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1522337094846-8a818192de1f?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1515377905703-c4788e51af15?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1596178065887-1198b6148b2b?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1505944270255-72b8c68c6a70?auto=format&fit=crop&q=80&w=1200",
  ],

  sections: {
    services: {
      title: "بروتوكولات دقيقة",
      subtitle: "علاجاتنا",
      // One image per service, same order as services[].
      images: [
        "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&q=80&w=600",
        "https://images.unsplash.com/photo-1573461160327-b450ce3d8e7f?auto=format&fit=crop&q=80&w=600",
        "https://images.unsplash.com/photo-1666214280557-f1b5022eb634?auto=format&fit=crop&q=80&w=600",
        "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&q=80&w=600",
        "https://images.unsplash.com/photo-1616394584738-fc6e612e71b9?auto=format&fit=crop&q=80&w=600",
      ],
    },
    team: {
      title: "فريقنا المتخصص",
      subtitle: "أيدٍ خبيرة",
      description:
        "أطباء معتمدون، أخصائيات تجميل مرخصات، وممرضون مسجلون — كل منهم يملك سنوات من التدريب السريري والتزام مشترك بنتائج طبيعية مبنية على أسس علمية.",
    },
    whyChooseUs: {
      title: "معاييرنا",
      subtitle: "لماذا {brand}",
      mainImage:
        "https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&q=80&w=1000",
      badge: "أطباء\nمعتمدون",
      benefits: [
        {
          iconName: "ShieldCheck",
          title: "منتجات معتمدة من FDA",
          desc: "كل مادة حقن ومنتج في عيادتنا حاصل على موافقة FDA. لا نساوم أبداً على السلامة أو جودة المصدر.",
        },
        {
          iconName: "Award",
          title: "أخصائيون معتمدون",
          desc: "فريقنا يحمل شهادات اعتماد متقدمة. التعليم المستمر ليس اختيارياً — بل إلزامي.",
        },
        {
          iconName: "HeartHandshake",
          title: "فلسفة النتائج الطبيعية",
          desc: "نحن نعزز جمالك، لا نغيّره. كل خطة علاجية مصممة للحفاظ على ملامحك المميزة — وليس لمحوها.",
        },
        {
          iconName: "Microscope",
          title: "بروتوكولات مخصصة",
          desc: "لا يوجد وجهان متشابهان. كل عميل يحصل على تقييم شخصي وخطة علاجية مصممة وفقاً لتشريح وجهه وأهدافه.",
        },
      ],
    },
    testimonials: {
      title: "تجارب عملائنا",
      subtitle: "ماذا يقولون",
    },
    gallery: {
      title: "قبل وبعد",
      subtitle: "نتائج حقيقية",
    },
    location: {
      title: "زوروا عيادتنا",
      subtitle: "موقعنا",
    },
    contact: {
      title: "تواصل معنا",
      subtitle: "احجز استشارة مجانية",
      description:
        "كل علاج يبدأ بحوار. احجز استشارة مجانية في العيادة وسيقوم أحد أخصائيينا بتصميم خطة تناسب أهدافك.",
    },
    booking: {
      title: "احجز جلسة",
      tagline: "علم الجمال الطبيعي",
      steps: {
        service: "العلاج",
        staff: "الأخصائي",
        datetime: "الموعد",
        details: "تأكيد",
        payment: "الدفع",
      },
      aiConsultant: {
        title: "مستشار البشرة الذكي",
        subtitle: "لست متأكداً من أين تبدأ؟",
        description:
          "صف مشكلة بشرتك ومستشارنا الذكي سيقترح لك العلاج الأنسب.",
        agentLabel: "مستشار البشرة",
        placeholder:
          "صف مشكلة بشرتك أو ما ترغب بتحسينه (مثال: 'خطوط دقيقة حول العينين، فقدان حجم في الخدود')...",
      },
      success: {
        title: "تم التأكيد",
        confirmed: "تم حجز الموعد!",
        requestSaved: "تم حفظ الطلب!",
        cancelled: "ملغى",
      },
    },
    instagram: {
      title: "تابعوا نتائجنا",
      handle: "@lumiere.clinic",
      url: "https://instagram.com/lumiere.clinic",
      images: [
        "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=400&h=400&fit=crop",
        "https://images.unsplash.com/photo-1582719508461-905c673771fd?w=400&h=400&fit=crop",
        "https://images.unsplash.com/photo-1516975080664-ed2fc6a32937?w=400&h=400&fit=crop",
        "https://images.unsplash.com/photo-1595476108010-b4d1f102b1b1?w=400&h=400&fit=crop",
        "https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=400&h=400&fit=crop",
        "https://images.unsplash.com/photo-1596178065887-1198b6148b2b?w=400&h=400&fit=crop",
      ],
    },
    admin: {
      staff: {
        title: "دليل الأخصائيين",
        scheduleTitle: "الجدول الأسبوعي",
        commitButton: "حفظ الجدول",
        enforcementTitle: "تطبيق التوفر",
        enforcementDesc:
          "جداول الأخصائيين تُطبَّق بشكل فوري. أي تغييرات في التوفر أو الأيام المحجوبة تسري حالاً لمنع الحجوزات المزدوجة.",
      },
    },
    faq: {
      title: "الأسئلة الشائعة",
      subtitle: "ما يودّ عملاؤنا معرفته",
      items: [
        { question: "هل الاستشارة مطلوبة قبل العلاج؟", answer: "نعم، تتضمن جلستك الأولى استشارة قصيرة لتقييم نوع بشرتك وأهدافك." },
        { question: "كيف أستعد لموعدي؟", answer: "تعال ببشرة نظيفة، تجنب التعرض للشمس قبل 24 ساعة، وأخبرنا عن أي أدوية تتناولها." },
        { question: "ما هي سياسة الإلغاء؟", answer: "نطلب إشعاراً قبل 24 ساعة للإلغاء. قد يترتب رسوم على الإلغاء المتأخر." },
        { question: "هل منتجاتكم آمنة للبشرة الحساسة؟", answer: "نستخدم منتجات طبية احترافية مختبرة من قبل أطباء جلدية ومناسبة لجميع أنواع البشرة." },
      ],
    },
  },
};
