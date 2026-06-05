import type { NichePreset } from "../../types";
import { presetThemeTattoo } from "./themes";

export const tattooPresetAr: NichePreset = {
  businessMode: "team",
  // ─── Business & Legal ────────────────────────────────────────────────────────
  business: {
    type: "tattoo",
    legalName: "MASTERPIECE INK STUDIO LLC",
    address:
      "87 شارع Inkwell، حي الفنون، لوس أنجلوس، CA 90012، الولايات المتحدة",
    cancellationPolicy: "48 ساعة قبل موعد الجلسة المحدد",
  },

  // ─── Brand ───────────────────────────────────────────────────────────────────
  brand: {
    name: "MASTERPIECE INK",
    tagline: "حيث يتحوّل الجلد إلى فن",
    description:
      "استوديو وشم فاخر — فنانون محترفون يحوّلون رؤيتك إلى تحفة دائمة. تصاميم مخصصة، خطوط دقيقة واستشارات معمّقة — كل قطعة فريدة من نوعها.",
    logoIconName: "Pen",
    faviconEmoji: "🖊️",
    ogImage: "https://images.unsplash.com/photo-1763888647744-c566e723c396?auto=format&fit=crop&q=80&w=1200",
    aiPersona:
      "أنت مستشار افتراضي في Masterpiece Ink، استوديو وشم راقٍ. مهمتك توجيه العملاء بثقة واحترافية — أجب عن أسئلتهم حول خدماتنا، ساعدهم في التحضير لجلستهم، اشرح العناية بعد الوشم، وانصحهم بالفنان المناسب لرؤيتهم. كن ودوداً، خبيراً وذا حس فني.",
  },

  theme: presetThemeTattoo,

  // ─── Hero ─────────────────────────────────────────────────────────────────────
  hero: {
    titlePrefix: "بشرتك،",
    titleHighlight: "لوحتنا",
    titleSuffix: "فن دائم لأصحاب الجرأة",
    subtitle:
      "كل مشروع يبدأ باستشارة مجانية وجهاً لوجه — بدون التزام وبدون عربون. التقِ بالفنان، حدّد الرؤية، ثم احجز جلستك. فن مصمّم خصيصاً بدقة جراحية.",
    ctaPrimary: "احجز استشارة مجانية",
    ctaSecondary: "شاهد الأعمال",
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
      name: "استشارة مجانية",
      description:
        "ابدأ من هنا — مجاناً وبدون أي التزام. جلسة شخصية مع الفنان لمدة 30–60 دقيقة لاستعراض الأعمال السابقة، مناقشة فكرتك، اختيار الموقع والأسلوب، ورسم خطة المشروع كاملة قبل دفع أي عربون.",
      duration: 60,
      price: 0,
    },
    {
      id: "custom-design",
      name: "تصميم مخصص",
      description:
        "عمل فني أصلي بالكامل مبني على رؤيتك. السعر 180$ للساعة — معظم التصاميم المخصصة تتطلب من جلسة إلى 4 جلسات حسب الحجم والتعقيد. يبدأ كل مشروع باستشارة مجانية ويتضمن موافقة على الرسم قبل الجلسة.",
      duration: 180,
      price: 180,
    },
    {
      id: "fine-line",
      name: "خطوط دقيقة ومينيماليزم",
      description:
        "دقة بإبرة واحدة لخطوط رفيعة للغاية، واقعية مصغّرة وتكوينات بسيطة. السعر 150$ للساعة. التصاميم الصغيرة أقل من 2 إنش قد تُسعَّر بسعر ثابت — يُحدَّد في الاستشارة المجانية.",
      duration: 120,
      price: 150,
    },
    {
      id: "black-grey-realism",
      name: "واقعية بالأسود والرمادي",
      description:
        "صور شخصية فائقة الواقعية ومشاهد سينمائية بالأسود والرمادي. السعر 200$ للساعة — المشاريع الكبيرة تُوزَّع على عدة جلسات لتشبّع الحبر والتعافي المثالي. تتطلب استشارة مجانية.",
      duration: 240,
      price: 200,
    },
    {
      id: "cover-up",
      name: "تغطية وتعديل الوشم",
      description:
        "حوّل وشماً قديماً لا تريده إلى عمل فني جديد. تتطلب استشارة إلزامية لتقييم التغطية. السعر 160$ للساعة — معظم عمليات التغطية تحتاج 2–3 جلسات. عربون تصميم 100$ بعد الاستشارة يُخصم من الفاتورة النهائية.",
      duration: 180,
      price: 160,
    },
    {
      id: "flash-small",
      name: "تصاميم جاهزة وقطع صغيرة",
      description:
        "تصاميم فلاش جاهزة وقطع أصلية صغيرة أقل من 3 إنشات. الحد الأدنى للاستوديو يبدأ من 120$ بسعر ثابت — بدون حساب بالساعة. مثالية للمبتدئين أو لإضافة قطعة لمجموعتك بدون استشارة.",
      duration: 60,
      price: 120,
    },
    {
      id: "piercing",
      name: "ثقب احترافي",
      description:
        "ثقب محترف باستخدام تيتانيوم طبي وفولاذ جراحي. من ثقب الأذن الكلاسيكي إلى الغضروف العلوي والمراسي السطحية — سعر ثابت، خدمة فورية، وطقم عناية كامل مُرفق.",
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
      specialty: "خطوط دقيقة ورسوم نباتية",
      bio: "أمضت إيزي خمس سنوات كرسّامة نباتية قبل اكتشافها لعالم الوشم. خطوطها الرفيعة بإبرة واحدة تضفي حساً عضوياً أقرب للألوان المائية. متخصصة في النباتات والحيوانات والمينيماليزم التجريدي — قطعها تبدو وكأنها جزء طبيعي من الجسد.",
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
        tuesday: { isOpen: true, hours: { start: "11:00", end: "19:00" }, breaks: [{ start: "14:00", end: "15:00", label: "غداء" }] },
        wednesday: { isOpen: true, hours: { start: "11:00", end: "19:00" }, breaks: [{ start: "14:00", end: "15:00", label: "غداء" }] },
        thursday: { isOpen: true, hours: { start: "11:00", end: "19:00" }, breaks: [{ start: "14:00", end: "15:00", label: "غداء" }] },
        friday: { isOpen: true, hours: { start: "11:00", end: "20:00" }, breaks: [{ start: "15:00", end: "16:00", label: "استراحة" }] },
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
      specialty: "واقعية بالأسود والرمادي",
      bio: "يُعتبر ماركو من أبرز فناني الواقعية بالأسود والرمادي على الساحل الغربي. خبرة تتجاوز 14 عاماً، صور شخصية فائقة التفصيل وتكوينات سينمائية نُشرت في مجلات وشم دولية. كل قطعة يصنعها ماركو هي دراسة في الضوء والظل والخلود.",
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
        wednesday: { isOpen: true, hours: { start: "12:00", end: "20:00" }, breaks: [{ start: "16:00", end: "17:00", label: "استراحة" }] },
        thursday: { isOpen: true, hours: { start: "12:00", end: "20:00" }, breaks: [{ start: "16:00", end: "17:00", label: "استراحة" }] },
        friday: { isOpen: true, hours: { start: "11:00", end: "21:00" }, breaks: [{ start: "15:00", end: "16:00", label: "غداء" }] },
        saturday: { isOpen: true, hours: { start: "10:00", end: "21:00" }, breaks: [{ start: "14:00", end: "15:00", label: "غداء" }] },
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
      specialty: "تصاميم مخصصة وتغطية الوشم",
      bio: "ديفون هو خبير حل المشكلات في الاستوديو. بخلفية في التصميم الغرافيكي ونهج جريء في التكوينات القوية، يتخصص في المشاريع المخصصة المعقدة وأعمال التغطية التحويلية. إن كان لديك قصة تريد حكايتها على بشرتك — أو خطأ تريد إزالته — ديفون هو فنانك.",
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
        tuesday: { isOpen: true, hours: { start: "11:00", end: "20:00" }, breaks: [{ start: "15:00", end: "16:00", label: "استراحة" }] },
        wednesday: { isOpen: true, hours: { start: "11:00", end: "20:00" }, breaks: [{ start: "15:00", end: "16:00", label: "استراحة" }] },
        thursday: { isOpen: true, hours: { start: "11:00", end: "20:00" }, breaks: [{ start: "15:00", end: "16:00", label: "استراحة" }] },
        friday: { isOpen: true, hours: { start: "11:00", end: "20:00" }, breaks: [{ start: "15:00", end: "16:00", label: "استراحة" }] },
        saturday: { isOpen: true, hours: { start: "10:00", end: "19:00" }, breaks: [] },
        sunday: { isOpen: false, hours: { start: "00:00", end: "00:00" }, breaks: [] },
      },
    },
  ],

  // ─── Testimonials ─────────────────────────────────────────────────────────────
  testimonials: [
    {
      name: "Serena Blackwood",
      title: "مديرة فنية",
      text: "حوّلت إيزي رسمة كانت في بالي منذ ثلاث سنوات إلى أروع قطعة خطوط دقيقة رأيتها في حياتي. الاستشارة وحدها كانت تستحق الزيارة.",
      rating: 5,
    },
    {
      name: "Damien Cruz",
      title: "مخرج سينمائي",
      text: "واقعية ماركو بالأسود والرمادي في مستوى آخر تماماً. كُمّي يبدو كصورة فوتوغرافية — الناس يوقفونني في الشارع باستمرار. يستحق كل قرش.",
      rating: 5,
    },
    {
      name: "Priya Nolan",
      title: "مهندسة معمارية",
      text: "كنت خائفة من فكرة تغطية وشمي القديم. ديفون فحص الوشم، صمّم شيئاً مخصصاً بالكامل، والنتيجة لا تُشبه ما كان هناك أبداً. تحوّل حقيقي.",
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
      title: "حرفة وإتقان",
      subtitle: "خدماتنا",
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
      title: "حبر وهوية // v1.0",
      subtitle: "الفنانون",
      description:
        "كل فنان في Masterpiece Ink تم اختياره ليس فقط لتميّزه التقني، بل لصوته الإبداعي الفريد. نحن لا نوظّف تقنيين — نحن نستضيف أصحاب رؤية. بشرتك تستحق الأفضل.",
    },
    whyChooseUs: {
      title: "المعيار",
      subtitle: "لماذا نحن",
      // Premium tattoo studio interior — clean, professional, dramatic lighting
      mainImage:
        "https://images.unsplash.com/photo-1760877611905-0f885a3ce551?auto=format&fit=crop&q=80&w=1000",
      badge: "10 سنوات\nمن الفن",
      benefits: [
        {
          iconName: "ShieldCheck",
          title: "نظافة بمعايير طبية",
          desc: "إبر أحادية الاستخدام، معدات معقّمة بالأوتوكلاف وتعقيم أسطح بدرجة المستشفيات بعد كل عميل. سلامتك أولويتنا المطلقة.",
        },
        {
          iconName: "Clock",
          title: "الاستشارة أولاً",
          desc: "كل مشروع يبدأ باستشارة مخصصة. نستثمر الوقت لفهم رؤيتك قبل رسم أي خط — لأن الدوام يتطلب الكمال.",
        },
        {
          iconName: "Award",
          title: "فنانون حائزون على جوائز",
          desc: "فريقنا حاصل على جوائز من معارض وشم دولية ومنشور في أبرز المجلات المتخصصة. أنت في كرسي موهبة عالمية.",
        },
        {
          iconName: "Zap",
          title: "فن مخصص فقط",
          desc: "لا جدران تصاميم جاهزة ولا قوالب معلّبة. كل وشم نصنعه هو عمل فني أصلي مصمّم حصرياً لك ولا يُعاد إنتاجه أبداً.",
        },
      ],
    },
    testimonials: {
      title: "أصوات الثقة",
      subtitle: "ماذا يقول عملاؤنا",
    },
    gallery: {
      title: "تحف دائمة",
      subtitle: "معرض الأعمال",
    },
    location: {
      title: "زُر الاستوديو",
      subtitle: "موقعنا",
    },
    contact: {
      title: "تواصل معنا",
      subtitle: "ابدأ رحلتك",
      description:
        "مستعد لتحويل رؤيتك إلى واقع؟ أرسل لنا رسالة، أرفق أي صور ملهمة، وسيتواصل معك أحد فنانينا لتحديد موعد استشارتك.",
    },
    booking: {
      title: "احجز زيارتك",
      tagline: "ابدأ باستشارة مجانية — ثم حدّد موعد جلستك حين تكون جاهزاً.",
      steps: {
        service: "الخدمة",
        staff: "الفنان",
        datetime: "الموعد",
        details: "التأكيد",
        payment: "الدفع",
      },
      aiConsultant: {
        title: "ذكاء الحبر",
        subtitle: "لا تعرف من أين تبدأ؟",
        description:
          "صِف فكرتك وسيوصي مستشارنا الذكي بالخدمة والأسلوب والفنان المناسب — لتصل إلى استشارتك مستعداً تماماً.",
        agentLabel: "مستشار إبداعي",
        placeholder:
          "صِف فكرتك (مثال: رسمة نباتية دقيقة على المعصم، بسيطة وناعمة)...",
      },
      success: {
        title: "تم بنجاح",
        confirmed: "تم التأكيد!",
        requestSaved: "تم حفظ الطلب!",
        cancelled: "تم الإلغاء",
      },
    },
    instagram: {
      title: "حبر طازج",
      handle: "@inkrebellion",
      url: "https://instagram.com/inkrebellion",
      images: [
        "https://images.unsplash.com/photo-1611501275019-9b5cda994e8d?w=400&h=400&fit=crop",
        "https://images.unsplash.com/photo-1640202352521-66c98a02e612?w=400&h=400&fit=crop",
        "https://images.unsplash.com/photo-1662524518420-bbded8ec7811?w=400&h=400&fit=crop",
        "https://images.unsplash.com/photo-1562962230-16e4623d36e6?w=400&h=400&fit=crop",
        "https://images.unsplash.com/photo-1604869515882-4d10fa4b0492?w=400&h=400&fit=crop",
        "https://images.unsplash.com/photo-1686577677352-c9249ed5972a?w=400&h=400&fit=crop",
      ],
    },
    admin: {
      staff: {
        title: "قائمة الفنانين",
        scheduleTitle: "ساعات العمل الأسبوعية",
        commitButton: "حفظ الجدول",
        enforcementTitle: "تطبيق الجدول",
        enforcementDesc:
          "محرك الحجوزات يطبّق جداول الفنانين تلقائياً. أي تعديل على ساعات العمل أو أيام الإغلاق يسري فوراً ويمنع الحجوزات المزدوجة.",
      },
    },
    faq: {
      title: "الأسئلة الشائعة",
      subtitle: "قبل أن تحصل على وشمك",
      items: [
        { question: "كيف أستعد لجلستي؟", answer: "نَم جيداً، تناول وجبة مغذية، اشرب كمية كافية من الماء، وتجنّب الكحول قبل 24 ساعة." },
        { question: "كم يكلّف الوشم؟", answer: "يختلف السعر حسب الحجم والتفاصيل والموقع. احجز استشارة للحصول على عرض سعر دقيق." },
        { question: "كم يستغرق التعافي؟", answer: "التعافي السطحي يستغرق 2-3 أسابيع. الشفاء الكامل يحتاج 4-6 أسابيع مع العناية المناسبة." },
        { question: "هل تقومون بتغطية الوشم القديم؟", answer: "نعم! فنانونا متخصصون في حلول التغطية الإبداعية. أحضر وشمك الحالي للاستشارة." },
      ],
    },
  },
};
