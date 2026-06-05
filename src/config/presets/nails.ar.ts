import type { NichePreset } from "../../types";
import { presetThemeNails } from "./themes";

export const nailsPresetAr: NichePreset = {
  businessMode: "team",
  // ─── Business & Legal ────────────────────────────────────────────────────────
  business: {
    type: "nails",
    legalName: "AURA NAIL STUDIO LLC",
    address: "214 شارع Bloom، حي التصميم، ميامي، FL 33132، الولايات المتحدة",
    cancellationPolicy: "قبل 24 ساعة من موعد الجلسة المحدد",
  },

  // ─── Brand ───────────────────────────────────────────────────────────────────
  brand: {
    name: "AURA NAIL STUDIO",
    tagline: "حيث يتألّق كل تفصيل",
    description:
      "ستوديو أظافر راقٍ يقدّم فن أظافر دقيق، أنظمة جل طويلة الأمد، وتصاميم مخصّصة بالكامل. كل موعد هو تجربة خاصة وهادئة مبنيّة حول ذوقك الشخصي.",
    logoIconName: "Sparkles",
    faviconEmoji: "💅",
    ogImage: "https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&q=80&w=1200",
    aiPersona:
      "أنتِ أخصائية افتراضية في Aura Nail Studio، ستوديو أظافر فاخر في حي التصميم بميامي. مهمّتك مرافقة العميلات بدفء واحتراف — الإجابة عن الخدمات، التحضير للموعد، شرح العناية بعد الجلسة، واقتراح الفنّية والعلاج المناسبين. كوني ودودة، خبيرة، ومهتمّة بالجمال.",
  },

  theme: presetThemeNails,

  // ─── Hero ─────────────────────────────────────────────────────────────────────
  hero: {
    titlePrefix: "أظافرك،",
    titleHighlight: "فنّنا",
    titleSuffix: "جمال دقيق، في كل مرة",
    subtitle:
      "كل موعد يبدأ بجلسة تصميم شخصية — نحدّد معاً الشكل والتشطيب واتجاه الستايل قبل بدء العلاج. فن أظافر مخصّص يُنفَّذ بدقة احترافية.",
    ctaPrimary: "احجزي موعدك",
    ctaSecondary: "تصفّحي المعرض",
    // Luxury nail salon interior — soft lighting, elegant station, premium aesthetic
    backgroundImage:
      "https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&q=80&w=2000",
  },

  // ─── Contact ─────────────────────────────────────────────────────────────────
  contact: {
    address: {
      street: "214 Bloom Street",
      district: "Design District",
      cityStateZip: "Miami, FL 33132",
    },
    phone: "(305) 555-0182",
    email: "hello@auranailstudio.com",
    social: {
      instagram: "https://instagram.com/auranailstudio",
      facebook: "https://facebook.com/auranailstudio",
      twitter: "https://twitter.com/auranailstudio",
    },
  },

  // ─── Business Hours ───────────────────────────────────────────────────────────
  hours: {
    monday: null,
    tuesday: { start: "10:00", end: "19:00" },
    wednesday: { start: "10:00", end: "19:00" },
    thursday: { start: "10:00", end: "19:00" },
    friday: { start: "10:00", end: "19:00" },
    saturday: { start: "10:00", end: "19:00" },
    sunday: { start: "11:00", end: "17:00" },
  },

  // ─── Services ────────────────────────────────────────────────────────────────
  // CRITICAL: services[i] maps 1:1 to sections.services.images[i].
  // If you add or reorder a service here, update sections.services.images below.
  //
  // Pricing model:
  //   services[0] Classic Manicure          → $45 flat
  //   services[1] Gel Manicure              → $65 flat
  //   services[2] Acrylic Full Set          → $85 flat
  //   services[3] Nail Art & Bespoke        → from $25/nail
  //   services[4] Luxury Spa Pedicure       → $75 flat
  //   services[5] Nail Extensions & Infills → from $55
  services: [
    {
      id: "classic-manicure",
      name: "مناكير كلاسيكي",
      description:
        "الأساس لأظافر مثالية. تقوم الفنّية بتشكيل الأظافر وبردها حسب الشكل المفضّل، والعناية بالجلد المحيط، مع تدليك مريح لليد والمعصم، ثم طبقة لون مثالية بلا خطوط. طقس كامل لمدة 45 دقيقة.",
      duration: 45,
      price: 45,
    },
    {
      id: "gel-manicure",
      name: "مناكير جل",
      description:
        "لون يدوم طويلاً يُثبَّت تحت ضوء UV للحصول على لمعان كالمرآة يقاوم التقشّر والبهتان لغاية ثلاثة أسابيع. يشمل تشكيل الأظافر والعناية بالجلد وترطيب اليدين واختيارك من مكتبة ألوان الجل الخاصة بنا. مثالي لصاحبات الجدول المزدحم.",
      duration: 60,
      price: 65,
    },
    {
      id: "acrylic-full-set",
      name: "سِت أكريليك كامل",
      description:
        "تركيبات أكريليك منحوتة حسب مواصفاتك بالضبط — الطول والشكل والتشطيب يُحدَّدون أثناء الجلسة. سواء تفضّلين كوفِن أو لوز أو مربّع أو ستيليتو، تنحت فنّياتنا كل ظفر بعناية لضمان المتانة والاندماج السلس مع الظفر الطبيعي.",
      duration: 90,
      price: 85,
    },
    {
      id: "nail-art",
      name: "فن الأظافر وتصميم حسب الطلب",
      description:
        "حوّلي أظافرك إلى لوحة فنية. رسومات يدوية دقيقة، تفاصيل ميكرو، أحجار كريمة، بودرة كروم، وعناصر نحتية ثلاثية الأبعاد — كلها تُنفَّذ حسب رؤيتك الخاصة. التسعير لكل ظفر حسب تعقيد التصميم. أحضري صوراً ملهمة أو دعينا نصمّم لكِ.",
      duration: 60,
      price: 25,
    },
    {
      id: "spa-pedicure",
      name: "بديكير سبا فاخر",
      description:
        "طقس متكامل للقدمين والساقين: نقع دافئ بأملاح معدنية عطرية، تقشير كامل، قناع مرطّب، تدليك مطوّل للساق والقدم، تشكيل الأظافر، وتشطيب جل من اختيارك. 75 دقيقة من الدلال المتواصل.",
      duration: 75,
      price: 75,
    },
    {
      id: "extensions-infills",
      name: "تركيبات وتعبئة",
      description:
        "صيانة لسِت الأكريليك أو الجل الصلب بتعبئة دقيقة تُعيد الطول وتصحّح فجوات النمو وتجدّد التشطيب. يشمل التشكيل والعناية بالجلد وتحديث اللون. متوفّر أيضاً كخدمة تركيبات كاملة فوق الظفر الطبيعي.",
      duration: 60,
      price: 55,
    },
  ],

  // ─── Staff ───────────────────────────────────────────────────────────────────
  staff: [
    {
      id: "sofia",
      slug: "sofia-reyes",
      name: "Sofia Reyes",
      // Portrait: professional female beauty technician, warm studio setting
      photoUrl:
        "https://images.unsplash.com/photo-1594744803329-e58b31de8bf5?auto=format&fit=crop&q=80&w=800",
      specialty: "جل وفن الأظافر",
      bio: "بدأت صوفيا كفنانة تشكيلية قبل أن تكتشف لوحتها الحقيقية — الأظافر. بخبرة ثماني سنوات وخلفية في الرسم التوضيحي، تمتلك عيناً استثنائية للتفاصيل في كل سِت تصنعه. تشتهر بتصاميمها المرسومة يدوياً والنقوش النباتية الرقيقة والبورتريهات المصغّرة، وتُبرَز أعمالها بانتظام في مجلات ميامي. تتعامل مع كل طلب كمشروع إبداعي مشترك حقيقي.",
      // Portfolio: finished nail art and gel manicure results only
      portfolio: [
        "https://images.unsplash.com/photo-1604654894610-df63bc536371?auto=format&fit=crop&q=80&w=1200",
        "https://images.unsplash.com/photo-1632345031435-8727f6897d53?auto=format&fit=crop&q=80&w=1200",
        "https://images.unsplash.com/photo-1607779097040-26e80aa78e66?auto=format&fit=crop&q=80&w=1200",
        "https://images.unsplash.com/photo-1519014816548-bf5fe059798b?auto=format&fit=crop&q=80&w=1200",
      ],
      social: {
        instagram: "https://instagram.com/sofiareyes.nails",
        twitter: "https://twitter.com/sofiareyes",
      },
      schedule: {
        monday: { isOpen: false, hours: { start: "00:00", end: "00:00" }, breaks: [] },
        tuesday: { isOpen: true, hours: { start: "10:00", end: "18:00" }, breaks: [{ start: "13:00", end: "14:00", label: "غداء" }] },
        wednesday: { isOpen: true, hours: { start: "10:00", end: "18:00" }, breaks: [{ start: "13:00", end: "14:00", label: "غداء" }] },
        thursday: { isOpen: true, hours: { start: "10:00", end: "19:00" }, breaks: [{ start: "13:00", end: "14:00", label: "غداء" }] },
        friday: { isOpen: true, hours: { start: "10:00", end: "19:00" }, breaks: [{ start: "14:00", end: "15:00", label: "استراحة" }] },
        saturday: { isOpen: true, hours: { start: "10:00", end: "18:00" }, breaks: [] },
        sunday: { isOpen: false, hours: { start: "00:00", end: "00:00" }, breaks: [] },
      },
    },
    {
      id: "camille",
      slug: "camille-dupont",
      name: "Camille Dupont",
      // Portrait: professional female beauty technician, elegant studio
      photoUrl:
        "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&q=80&w=800",
      specialty: "أكريليك ومنحوت",
      bio: "تدرّبت كاميل في أكاديمية رائدة للأظافر في باريس قبل انتقالها إلى ميامي، حاملةً معها دقة أوروبية مميّزة في فن النحت. تتخصّص في الأشكال المعمارية — كوفِن طويل ولوز أنيق وستيليتو دراماتيكي — مع طبقات أكريليك ناعمة تماماً تحافظ على شكلها لأسابيع. أعمال كاميل متقنة تقنياً وبصرياً بنفس المستوى.",
      // Portfolio: finished acrylic sets and sculpted nail results only
      portfolio: [
        "https://images.unsplash.com/photo-1610461888750-10bfc601b874?auto=format&fit=crop&q=80&w=1200",
        "https://images.unsplash.com/photo-1610992015732-2449b76344bc?auto=format&fit=crop&q=80&w=1200",
        "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&q=80&w=1200",
        "https://images.unsplash.com/photo-1631729371254-42c2892f0e6e?auto=format&fit=crop&q=80&w=1200",
      ],
      social: {
        instagram: "https://instagram.com/camilledupont.nails",
        facebook: "https://facebook.com/camilledupont",
      },
      schedule: {
        monday: { isOpen: false, hours: { start: "00:00", end: "00:00" }, breaks: [] },
        tuesday: { isOpen: false, hours: { start: "00:00", end: "00:00" }, breaks: [] },
        wednesday: { isOpen: true, hours: { start: "10:00", end: "19:00" }, breaks: [{ start: "13:00", end: "14:00", label: "غداء" }] },
        thursday: { isOpen: true, hours: { start: "10:00", end: "19:00" }, breaks: [{ start: "13:00", end: "14:00", label: "غداء" }] },
        friday: { isOpen: true, hours: { start: "10:00", end: "19:00" }, breaks: [{ start: "14:00", end: "15:00", label: "استراحة" }] },
        saturday: { isOpen: true, hours: { start: "10:00", end: "19:00" }, breaks: [{ start: "13:30", end: "14:30", label: "غداء" }] },
        sunday: { isOpen: true, hours: { start: "11:00", end: "17:00" }, breaks: [] },
      },
    },
    {
      id: "yuki",
      slug: "yuki-tanaka",
      name: "Yuki Tanaka",
      // Portrait: professional female beauty technician, calm and polished aesthetic
      photoUrl:
        "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?auto=format&fit=crop&q=80&w=800",
      specialty: "كلاسيك وسبا",
      bio: "تدرّبت يوكي في تقليد الأظافر والعافية الياباني العريق، حيث تُعامَل التقنية الدقيقة وراحة العميلة بتقدير متساوٍ. تتخصّص في المناكير الكلاسيكي وتشطيبات الجل والبديكير الفاخر — خدمات تتعامل معها بنفس الإتقان الذي يُعامَل به أي فن حسب الطلب. تصف العميلات جلسة مع يوكي بأنها مُجدِّدة بقدر ما هي جميلة.",
      // Portfolio: finished classic manicure and spa pedicure results only
      portfolio: [
        "https://images.unsplash.com/photo-1595476108010-b4d1f102b1b1?auto=format&fit=crop&q=80&w=1200",
        "https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&q=80&w=1200",
        "https://images.unsplash.com/photo-1591085686350-798c0f9faa7f?auto=format&fit=crop&q=80&w=1200",
        "https://images.unsplash.com/photo-1457972729786-0411a3b2b626?auto=format&fit=crop&q=80&w=1200",
      ],
      social: {
        instagram: "https://instagram.com/yukitanaka.nails",
        twitter: "https://twitter.com/yukitanaka",
      },
      schedule: {
        monday: { isOpen: false, hours: { start: "00:00", end: "00:00" }, breaks: [] },
        tuesday: { isOpen: true, hours: { start: "10:00", end: "19:00" }, breaks: [{ start: "13:00", end: "14:00", label: "غداء" }] },
        wednesday: { isOpen: true, hours: { start: "10:00", end: "19:00" }, breaks: [{ start: "13:00", end: "14:00", label: "غداء" }] },
        thursday: { isOpen: true, hours: { start: "10:00", end: "19:00" }, breaks: [{ start: "13:00", end: "14:00", label: "غداء" }] },
        friday: { isOpen: true, hours: { start: "10:00", end: "19:00" }, breaks: [{ start: "14:00", end: "15:00", label: "استراحة" }] },
        saturday: { isOpen: true, hours: { start: "10:00", end: "19:00" }, breaks: [] },
        sunday: { isOpen: true, hours: { start: "11:00", end: "17:00" }, breaks: [] },
      },
    },
  ],

  // ─── Testimonials ─────────────────────────────────────────────────────────────
  testimonials: [
    {
      name: "Alessandra Monroe",
      title: "مصمّمة أزياء",
      text: "زرت ستوديوهات أظافر في أنحاء ميامي ولا شيء يُقارن بـ Aura. رسمت صوفيا تصميماً زهرياً على أظافري جعل عميلات جلسة التصوير يسألن أين ذهبت. الاستشارة المسبقة غيّرت كل شيء — فهمت ذوقي من اللحظة الأولى.",
      rating: 5,
    },
    {
      name: "Natalie Chen",
      title: "مصمّمة ديكور",
      text: "عمل كاميل بالأكريليك في مستوى آخر تماماً. سِت الكوفِن صمد خمسة أسابيع بدون أي رفع. الستوديو نظيف جداً والتجربة فاخرة فعلاً، وليس فقط غالية.",
      rating: 5,
    },
    {
      name: "Rachel Torres",
      title: "مديرة تسويق",
      text: "حجزت بديكير السبا الفاخر مع يوكي بعد أسبوع مرهق وخرجت وكأنني شخص جديد. الاهتمام بالنظافة واضح من لحظة الجلوس، والعلاج كان أدق بديكير حصلت عليه في حياتي. حجزت مرة ثانية فوراً.",
      rating: 5,
    },
  ],

  // ─── Gallery ─────────────────────────────────────────────────────────────────
  // 12 curated finished nail art and manicure shots.
  // Rule: NO process shots, NO bare unpolished hands. Only completed nail looks.
  gallery: [
    "https://images.unsplash.com/photo-1604654894610-df63bc536371?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1632345031435-8727f6897d53?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1607779097040-26e80aa78e66?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1519014816548-bf5fe059798b?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1610461888750-10bfc601b874?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1610992015732-2449b76344bc?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1631729371254-42c2892f0e6e?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1595476108010-b4d1f102b1b1?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1457972729786-0411a3b2b626?auto=format&fit=crop&q=80&w=1200",
  ],

  // ─── Section Copy ─────────────────────────────────────────────────────────────
  sections: {
    services: {
      title: "لمسة ودقّة",
      subtitle: "خدماتنا",
      // ACTION shots — one per service, same order as services[].
      // services[0] Classic Manicure      → technician applying polish
      // services[1] Gel Manicure          → in-session manicure detail
      // services[2] Acrylic Full Set      → sculpted extension result
      // services[3] Nail Art & Bespoke    → artistic nail detail
      // services[4] Luxury Spa Pedicure   → finished pedicure result
      // services[5] Extensions & Infills  → refined manicure finish
      images: [
        "https://images.unsplash.com/photo-1753285310651-6974a839c992?auto=format&fit=crop&q=80&w=600",
        "https://images.unsplash.com/photo-1676926606566-58f2e00b592b?auto=format&fit=crop&q=80&w=600",
        "https://images.unsplash.com/photo-1610461888750-10bfc601b874?auto=format&fit=crop&q=80&w=600",
        "https://images.unsplash.com/photo-1609587312208-cea54be969e7?auto=format&fit=crop&q=80&w=600",
        "https://images.unsplash.com/photo-1707725238063-0c54fb6963d1?auto=format&fit=crop&q=80&w=600",
        "https://images.unsplash.com/photo-1674691412909-8405f0a19940?auto=format&fit=crop&q=80&w=600",
      ],
    },
    team: {
      title: "جمال وإتقان // v1.0",
      subtitle: "الفنّيات",
      description:
        "كل فنّية في Aura Nail Studio اختيرت ليس فقط لتميّزها التقني، بل للعناية والذكاء الإبداعي الذي تجلبه لكل عميلة. نحن ستوديو متخصّصات — ثلاثة تخصّصات مختلفة، معيار واحد مشترك من الكمال.",
    },
    whyChooseUs: {
      title: "المعيار",
      subtitle: "لماذا تختاريننا",
      // Elegant nail studio interior — clean stations, soft lighting, premium detail
      mainImage:
        "https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&q=80&w=1000",
      badge: "8 سنوات\nمن الجمال",
      benefits: [
        {
          iconName: "ShieldCheck",
          title: "نظافة لا تقبل المساومة",
          desc: "كل أداة تُعقَّم بين عميلة وأخرى، والأدوات ذات الاستخدام الواحد تُتلف بعد كل جلسة، ومحطات العمل تُطهَّر بمعايير طبية. سلامتك وراحة بالك أولاً.",
        },
        {
          iconName: "Sparkles",
          title: "استشارة شخصية",
          desc: "قبل كل خدمة نتّفق على اتجاه الستايل وأهدافك للأظافر وتفضيلات التشطيب — لتكون النتيجة مقصودة وعملية وفريدة من نوعها.",
        },
        {
          iconName: "Palette",
          title: "تصميم مخصّص فعلاً",
          desc: "لا قوالب جاهزة ولا مخطّطات عامة. كل تصميم في Aura يُبتكَر خصيصاً لكِ — يُرسَم ويُلوَّن يدوياً ولا يُكرَّر أبداً.",
        },
        {
          iconName: "Award",
          title: "منتجات فاخرة فقط",
          desc: "نستخدم فقط أنظمة جل احترافية وتركيبات خالية من HEMA وعلامات حصرية للصالونات. صحة أظافرك على المدى الطويل مهمّة لنا بقدر نتيجة اليوم.",
        },
      ],
    },
    testimonials: {
      title: "أصوات الثقة",
      subtitle: "ماذا تقول عميلاتنا",
    },
    gallery: {
      title: "فن في التفاصيل",
      subtitle: "معرض الأعمال",
    },
    location: {
      title: "زوري الستوديو",
      subtitle: "موقعنا",
    },
    contact: {
      title: "تواصلي معنا",
      subtitle: "ابدئي رحلتك",
      description:
        "مستعدّة لتجربة فن أظافر دقيق؟ أرسلي لنا رسالة، شاركينا أي صور ملهمة تحبّينها، وسيتواصل فريقنا معك لتحديد الموعد.",
    },
    booking: {
      title: "احجزي زيارتك",
      tagline:
        "احجزي خدمتك مباشرة ونسّقي إطلالتك مع الفنّية قبل بدء الجلسة.",
      steps: {
        service: "الخدمة",
        staff: "الفنّية",
        datetime: "الموعد",
        details: "تأكيد",
        payment: "الدفع",
      },
      aiConsultant: {
        title: "ذكاء الأظافر",
        subtitle: "مش متأكّدة من وين تبدئي؟",
        description:
          "وصفي الإطلالة اللي في بالك وأخصائيتنا الذكية رح توصيلك بالخدمة والفنّية والطريقة المناسبة — عشان توصلي لموعدك جاهزة تماماً.",
        agentLabel: "مستشارة الجمال",
        placeholder:
          "وصفي إطلالتك المثالية (مثلاً: أظافر لوز وردي ناعم مع لمسات ذهبية رقيقة)...",
      },
      success: {
        title: "تم بنجاح",
        confirmed: "تمّ التأكيد!",
        requestSaved: "تم حفظ الطلب!",
        cancelled: "ملغى",
      },
    },
    instagram: {
      title: "إلهام الأظافر",
      handle: "@auranailstudio",
      url: "https://instagram.com/auranailstudio",
      images: [
        "https://images.unsplash.com/photo-1604654894610-df63bc536371?w=400&h=400&fit=crop",
        "https://images.unsplash.com/photo-1632345031435-8727f6897d53?w=400&h=400&fit=crop",
        "https://images.unsplash.com/photo-1607779097040-26e80aa78e66?w=400&h=400&fit=crop",
        "https://images.unsplash.com/photo-1632345031435-8727f6897d53?w=400&h=400&fit=crop",
        "https://images.unsplash.com/photo-1607779097040-26e80aa78e66?w=400&h=400&fit=crop",
        "https://images.unsplash.com/photo-1610992015732-2449b76344bc?w=400&h=400&fit=crop",
      ],
    },
    admin: {
      staff: {
        title: "طاقم الفنّيات",
        scheduleTitle: "نافذة العمل الأسبوعية",
        commitButton: "حفظ الجدول",
        enforcementTitle: "تطبيق الجدول",
        enforcementDesc:
          "محرّك الحجوزات يطبّق جداول الفنّيات آنياً. أي تغيير في ساعات العمل الأسبوعية أو أيام الإغلاق يسري فوراً ويمنع الحجوزات المتعارضة.",
      },
    },
    faq: {
      title: "الأسئلة الشائعة",
      subtitle: "كل ما تحتاجين معرفته عن خدمات الأظافر",
      items: [
        { question: "كم يدوم سِت الجل؟", answer: "سِت الجل الاحترافي يدوم عادةً من 3 إلى 4 أسابيع مع العناية المناسبة." },
        { question: "هل عندكم فن أظافر؟", answer: "طبعاً! من التصاميم البسيطة إلى الرسم اليدوي المتقن. تصفّحي معرضنا للإلهام." },
        { question: "هل إزالة الجل مشمولة؟", answer: "إزالة الجل مشمولة عند حجز سِت جديد. الإزالة المنفردة متوفّرة أيضاً." },
        { question: "ماذا لو انكسر ظفر قبل موعدي التالي؟", answer: "نقدّم إصلاحاً مجانياً خلال الأسبوع الأول بعد الموعد." },
      ],
    },
  },
};
