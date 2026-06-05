import type { NichePreset } from "../../types";
import { presetThemeRemodelaciones } from "./themes";

export const remodelacionesPresetAr: NichePreset = {
  businessMode: "team",
  business: {
    type: "remodelaciones",
    legalName: "BrushCraft Painting Pty Ltd",
    address: "Sydney, NSW, Australia",
    cancellationPolicy: "48 ساعة قبل موعد البدء المحدد",
  },

  brand: {
    name: "BrushCraft",
    tagline: "دهان وطلاء منازل احترافي في كل أنحاء سيدني",
    description: "خدمات طلاء داخلي وخارجي احترافية. مرخّصون ومؤمّنون مع ضمان جودة شامل. احصل على عرض سعر مجاني اليوم.",
    logoIconName: "Paintbrush",
    faviconEmoji: "\u{1F3E0}",
    aiPersona: "أنت مستشار افتراضي لشركة طلاء ودهان احترافية. ساعد العملاء على فهم خدماتنا والحصول على عروض أسعار والتعرّف على طريقة عملنا. كن محترفًا ومتمكّنًا ومتعاونًا.",
  },

  theme: presetThemeRemodelaciones,

  hero: {
    titlePrefix: "نحوّل",
    titleHighlight: "منزلك",
    titleSuffix: "بلمسة مثالية",
    subtitle: "طلاء داخلي وخارجي للمنازل والمنشآت التجارية. مرخّصون ومؤمّنون مع ضمان جودة شامل.",
    ctaPrimary: "احصل على عرض سعر مجاني",
    ctaSecondary: "شاهد أعمالنا",
    backgroundImage: "https://images.unsplash.com/photo-1774977737078-7ccc2ac697e6?auto=format&fit=crop&q=80&w=2000",
    variant: "slider",
    beforeImage: "https://images.unsplash.com/photo-1717281234297-3def5ae3eee1?auto=format&fit=crop&q=80&w=1600",
    afterImage: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&q=80&w=1600",
    stats: [
      { value: "500+", label: "منزل تم طلاؤه" },
      { value: "15+", label: "سنة خبرة" },
      { value: "100%", label: "رضا العملاء" },
    ],
  },

  contact: {
    address: {
      street: "42 Painter's Lane",
      district: "Inner West",
      cityStateZip: "Sydney, NSW 2000",
    },
    phone: "+61 4XX XXX XXX",
    email: "hello@brushcraftpainting.com.au",
    social: {
      instagram: "https://instagram.com/brushcraftpainting",
      facebook: "https://facebook.com/brushcraftpainting",
    },
  },

  hours: {
    monday: { start: "07:00", end: "17:00" },
    tuesday: { start: "07:00", end: "17:00" },
    wednesday: { start: "07:00", end: "17:00" },
    thursday: { start: "07:00", end: "17:00" },
    friday: { start: "07:00", end: "16:00" },
    saturday: { start: "08:00", end: "13:00" },
    sunday: null,
  },

  services: [
    { id: "consultation", name: "استشارة مجانية", description: "نزور موقعك، نناقش الألوان، ونقدّم لك عرض سعر مفصّل بالكتابة. بدون أي التزام.", duration: 60, price: 0, fromPrice: "مجانًا", popular: true, features: ["استشارة ألوان في الموقع", "عرض سعر خلال 24 ساعة", "بدون التزام أو ضغط", "نصائح متخصّصة للدهانات والتشطيبات"] },
    { id: "interior", name: "طلاء داخلي", description: "طلاء داخلي شامل يتضمّن الجدران والأسقف والإطارات وجدران الأكسنت بدهانات فاخرة.", duration: 0, price: 1200, fromPrice: "$1,200", features: ["جدران وأسقف", "إطارات وقوالب تشطيب", "جدران مميّزة وأكسنت", "استشارة ألوان مشمولة"] },
    { id: "exterior", name: "طلاء خارجي", description: "طلاء خارجي كامل بطبقات مقاومة للعوامل الجوية لحماية طويلة الأمد.", duration: 0, price: 2500, fromPrice: "$2,500", features: ["جدران خارجية كاملة", "أفاريز ومزاريب وحواف", "إطارات نوافذ وأبواب", "طلاء مقاوم للعوامل الجوية"] },
    { id: "deck-fence", name: "صبغ الأسطح الخشبية والأسوار", description: "صبغ الأسطح الخشبية والأسوار مع حماية من الأشعة فوق البنفسجية والعوامل الجوية.", duration: 0, price: 800, fromPrice: "$800", features: ["صبغ أسطح خشبية", "طلاء وصبغ أسوار", "غسيل بالضغط مشمول", "حماية من الأشعة فوق البنفسجية والطقس"] },
  ],

  staff: [
    { id: "lead-painter", slug: "lead-painter", name: "كبير الدهّانين", specialty: "مدير مشاريع", bio: "أكثر من 15 سنة خبرة في الطلاء السكني والتجاري.", photoUrl: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&q=80&w=800", portfolio: [], schedule: { monday: { isOpen: true, hours: { start: "07:00", end: "17:00" }, breaks: [] }, tuesday: { isOpen: true, hours: { start: "07:00", end: "17:00" }, breaks: [] }, wednesday: { isOpen: true, hours: { start: "07:00", end: "17:00" }, breaks: [] }, thursday: { isOpen: true, hours: { start: "07:00", end: "17:00" }, breaks: [] }, friday: { isOpen: true, hours: { start: "07:00", end: "16:00" }, breaks: [] }, saturday: { isOpen: false, hours: { start: "08:00", end: "13:00" }, breaks: [] }, sunday: { isOpen: false, hours: { start: "09:00", end: "17:00" }, breaks: [] } } },
  ],

  testimonials: [
    { name: "سارة م.", title: "صاحبة منزل، بوندي", text: "عمل رائع بكل معنى الكلمة على الواجهة الخارجية. الفريق كان ملتزمًا بالمواعيد، نظيفًا، والنتيجة النهائية لا تشوبها شائبة. أنصح بهم بشدة!", rating: 5 },
    { name: "جيمس و.", title: "صاحب منزل، نيوتاون", text: "طلوا كل الداخل خلال أربعة أيام بدون أي إزعاج. محترفون وسريعون مع نصائح ممتازة للألوان.", rating: 5 },
    { name: "ليندا ت.", title: "مديرة عقارات، تشاتسوود", text: "نستعين بـ BrushCraft لجميع أعمال إعادة الطلاء في عقاراتنا. موثوقون وأسعارهم عادلة والمستأجرون دائمًا سعداء بالنتائج.", rating: 5 },
  ],

  gallery: [
    "https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?auto=format&fit=crop&q=80&w=800",
    "https://images.unsplash.com/photo-1600573472591-ee6b68d14c68?auto=format&fit=crop&q=80&w=800",
    "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&q=80&w=800",
    "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&q=80&w=800",
  ],

  sections: {
    services: {
      title: "خدماتنا",
      subtitle: "حلول طلاء احترافية لكل مشروع",
      images: [
        "https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&q=80&w=800",
        "https://images.unsplash.com/photo-1556909172-54557c7e4fb7?auto=format&fit=crop&q=80&w=800",
        "https://images.unsplash.com/photo-1778342259272-142fa3f81859?auto=format&fit=crop&q=80&w=800",
        "https://images.unsplash.com/photo-1600585154363-67eb9e2e2099?auto=format&fit=crop&q=80&w=800",
      ],
    },
    team: {
      title: "فريقنا",
      subtitle: "دهّانون مرخّصون وذوو خبرة",
      description: "فريقنا من الدهّانين المهرة يجلب سنوات من الخبرة والاهتمام بأدق التفاصيل لكل مشروع.",
    },
    whyChooseUs: {
      title: "لماذا تختارنا",
      subtitle: "جودة يمكنك الاعتماد عليها",
      benefits: [
        { title: "مرخّصون ومؤمّنون", desc: "مرخّصون ومؤمّنون بالكامل لراحة بالك.", iconName: "Shield" },
        { title: "دهانات فاخرة", desc: "نستخدم فقط دهانات Dulux و Taubmans الفاخرة في كل مشروع.", iconName: "Droplets" },
        { title: "تحضير دقيق", desc: "معجنة وصنفرة وتأسيس — تحضير صحيح لنتيجة تدوم.", iconName: "Hammer" },
        { title: "بالموعد وبالميزانية", desc: "نحترم جدولك الزمني وننجز حسب ما اتفقنا عليه.", iconName: "Clock" },
        { title: "موقع عمل نظيف", desc: "نتعامل مع ملكيّتك كأنها ملكنا — ننظّف كل يوم.", iconName: "Sparkles" },
        { title: "ضمان الجودة", desc: "ضمان خطّي على جودة التنفيذ في جميع أعمالنا.", iconName: "Award" },
      ],
      mainImage: "https://images.unsplash.com/photo-1600585154526-990dced4db0d?auto=format&fit=crop&q=80&w=800",
      badge: "دهّانون مرخّصون",
    },
    testimonials: { title: "ماذا يقول عملاؤنا", subtitle: "5.0 على تقييمات جوجل" },
    gallery: { title: "أعمالنا", subtitle: "تحوّلات قبل وبعد" },
    location: { title: "منطقة الخدمة", subtitle: "سيدني وولاية نيو ساوث ويلز" },
    contact: { title: "احصل على عرض سعر", subtitle: "تقديرات مجانية بدون التزام", description: "أخبرنا عن مشروعك وسنقدّم لك عرض سعر مفصّل خلال 24 ساعة." },
    booking: {
      title: "احجز استشارة",
      tagline: "استشارة ألوان مجانية في الموقع",
      steps: { service: "نوع الخدمة", staff: "المستشار", datetime: "التاريخ المفضّل", details: "بياناتك", payment: "التأكيد" },
      aiConsultant: { title: "مستشار المشاريع", subtitle: "غير متأكد مما تحتاج؟", description: "مستشارنا الذكي يساعدك في معرفة الخدمات المناسبة لمشروعك.", agentLabel: "المستشار الذكي", placeholder: "صِف مشروع الطلاء الخاص بك..." },
      success: { title: "تم حجز الاستشارة", confirmed: "سنتواصل معك للتأكيد!", requestSaved: "تم حفظ طلبك.", cancelled: "تم إلغاء الحجز." },
    },
    admin: {
      staff: { title: "إدارة الفريق", scheduleTitle: "الجداول الزمنية", commitButton: "حفظ التغييرات", enforcementTitle: "التوفّر", enforcementDesc: "تعيين أوقات توفّر الفريق." },
    },
    process: {
      title: "طريقة عملنا",
      subtitle: "عمليتنا المُثبتة من أربع خطوات",
      steps: [
        { number: "01", title: "استشارة مجانية", description: "نزور موقعك، نناقش الألوان، ونقدّم لك عرض سعر مفصّل بالكتابة. بدون أي التزام.", iconName: "MessageCircle" },
        { number: "02", title: "التحضير والحماية", description: "نغطّي الأسطح ونصنفر ونعالج الشقوق ونؤسّس الأسطح لضمان التصاق مثالي للطلاء.", iconName: "ClipboardList" },
        { number: "03", title: "الطلاء والتحويل", description: "دهّانونا المحترفون يطبّقون الدهانات الفاخرة بدقة: خطوط نظيفة وتغطية متساوية.", iconName: "Paintbrush" },
        { number: "04", title: "الجولة النهائية", description: "نتفقّد كل التفاصيل معك ولا نغادر إلا عندما تكون راضيًا 100%.", iconName: "CheckCircle" },
      ],
    },
    portfolio: {
      title: "مشاريعنا",
      subtitle: "تحوّلات حديثة في أنحاء سيدني",
      filters: [
        { key: "all", label: "الكل" },
        { key: "interior", label: "داخلي" },
        { key: "exterior", label: "خارجي" },
      ],
      projects: [
        {
          title: "منزل خشبي، بوندي", type: "إعادة طلاء خارجي", description: "إعادة طلاء خارجية كاملة لمنزل خشبي كلاسيكي. أزلنا الطلاء المتقشّر وعالجنا الشقوق وأسّسنا الخشب المكشوف ثم طبّقنا طبقتين من الطلاء المقاوم للعوامل الجوية.", duration: "5 أيام", size: "220 م²", filter: "exterior",
          images: ["https://images.unsplash.com/photo-1568605114967-8130f3a36994?auto=format&fit=crop&q=80&w=800"],
          gallery: [
            { before: "https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?auto=format&fit=crop&q=80&w=600", after: "https://images.unsplash.com/photo-1568605114967-8130f3a36994?auto=format&fit=crop&q=80&w=600", caption: "الواجهة الأمامية" },
            { before: "https://images.unsplash.com/photo-1459767129954-1b1c1f9b9ace?auto=format&fit=crop&q=80&w=600", after: "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&q=80&w=600", caption: "الواجهة الجانبية" },
          ],
        },
        {
          title: "كوخ، سوري هيلز", type: "تجديد داخلي", description: "إعادة طلاء داخلية كاملة: جدران وأسقف وقوالب تشطيب وإطارات أبواب بلوحة ألوان محايدة عصرية ودهانات منخفضة المركبات العضوية.", duration: "4 أيام", size: "150 م²", filter: "interior",
          images: ["https://images.unsplash.com/photo-1600210492493-0946911123ea?auto=format&fit=crop&q=80&w=800"],
          gallery: [
            { before: "https://images.unsplash.com/photo-1717281234297-3def5ae3eee1?auto=format&fit=crop&q=80&w=600", after: "https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?auto=format&fit=crop&q=80&w=600", caption: "غرفة المعيشة" },
            { before: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&q=80&w=600", after: "https://images.unsplash.com/photo-1600566752355-35792bedcfea?auto=format&fit=crop&q=80&w=600", caption: "منطقة المطبخ" },
          ],
        },
        {
          title: "منزل عائلي، باراماتا", type: "خارجي كامل", description: "منزل كبير من طابقين. غسيل بالضغط العالي وسدّ الشقوق الدقيقة وطلاء بلوحة ألوان رمادية عصرية مع إطارات بيضاء.", duration: "6 أيام", size: "310 م²", filter: "exterior",
          images: ["https://images.unsplash.com/photo-1574359411659-15573a27fd0c?auto=format&fit=crop&q=80&w=800"],
          gallery: [
            { before: "https://images.unsplash.com/photo-1767022518702-5cbf807163ec?auto=format&fit=crop&q=80&w=600", after: "https://images.unsplash.com/photo-1759406066673-f76869a4e6db?auto=format&fit=crop&q=80&w=600", caption: "المنظر من الشارع" },
          ],
        },
        {
          title: "فيلا شاطئية، مانلي", type: "خارجي وسطح خشبي", description: "إعادة طلاء خارجية كاملة مع صبغ سطح خشبي بطبقات مقاومة للملح والأشعة فوق البنفسجية مصمّمة للمناطق الساحلية.", duration: "7 أيام", size: "400 م²", filter: "exterior",
          images: ["https://images.unsplash.com/photo-1742900280864-bcc27353ceba?auto=format&fit=crop&q=80&w=800"],
          gallery: [
            { before: "https://images.unsplash.com/photo-1776871293001-3e44d160564b?auto=format&fit=crop&q=80&w=600", after: "https://images.unsplash.com/photo-1594468243943-c031c526dbc7?auto=format&fit=crop&q=80&w=600", caption: "الواجهة والسطح الخشبي" },
          ],
        },
        {
          title: "تجديد، ماريكفيل", type: "داخلي وخارجي", description: "طلاء شامل بعد التجديد لمنزل تمّ توسيعه حديثًا. تنسيق جدران الأكسنت الداخلية مع لون الواجهة الخارجية.", duration: "8 أيام", size: "260 م²", filter: "interior",
          images: ["https://images.unsplash.com/photo-1613545325278-f24b0cae1224?auto=format&fit=crop&q=80&w=800"],
          gallery: [
            { before: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&q=80&w=600", after: "https://images.unsplash.com/photo-1600607687644-c7171b42498f?auto=format&fit=crop&q=80&w=600", caption: "غرفة المعيشة الرئيسية" },
            { before: "https://images.unsplash.com/photo-1448630360428-65456885c650?auto=format&fit=crop&q=80&w=600", after: "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&q=80&w=600", caption: "تجديد المطبخ" },
          ],
        },
      ],
    },
    faq: {
      title: "الأسئلة الشائعة",
      subtitle: "أسئلة متكرّرة حول خدماتنا",
      items: [
        { question: "كم يستغرق المشروع عادةً؟", answer: "تختلف المدة حسب حجم المشروع. غرفة واحدة تستغرق 3-5 أيام، والتجديد الكامل من أسبوعين إلى 6 أسابيع." },
        { question: "هل تقدّمون تقديرات مجانية؟", answer: "نعم! نقدّم استشارات في الموقع وعروض أسعار مفصّلة بدون أي التزام." },
        { question: "هل أنتم مرخّصون ومؤمّنون؟", answer: "مرخّصون ومؤمّنون بالكامل. نقدّم شهادات عند الطلب." },
        { question: "هل أحتاج إلى مغادرة المنزل أثناء العمل؟", answer: "في معظم المشاريع لا. نعمل على أجزاء متتالية وننظّف في نهاية كل يوم." },
      ],
    },
  },
};
