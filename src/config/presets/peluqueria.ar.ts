import type { NichePreset, WorkDay } from "../../types";
import { presetThemePeluqueria } from "./themes";

// Peluquería (BLOQUE-04): misma estructura, catálogo e imágenes que peluqueria.he.ts.

const IMG = "https://images.unsplash.com/photo-";
const q = "?auto=format&fit=crop&q=80&w=";

const WEEKDAY: WorkDay = { isOpen: true, hours: { start: "09:00", end: "20:00" }, breaks: [{ start: "14:00", end: "14:30", label: "استراحة" }] };
const FRIDAY: WorkDay = { isOpen: true, hours: { start: "08:00", end: "14:00" }, breaks: [] };
const CLOSED: WorkDay = { isOpen: false, hours: { start: "00:00", end: "00:00" }, breaks: [] };

export const peluqueriaPresetAr: NichePreset = {
  businessMode: "team",
  business: {
    type: "peluqueria",
    legalName: "ستوديو نوعا للشعر",
    address: "شارع بياليك 24، رمات غان، 5245204، إسرائيل",
    cancellationPolicy: "إلغاء مجاني حتى 24 ساعة قبل الموعد؛ الإلغاء المتأخر أو عدم الحضور — 50% من سعر الخدمة",
  },

  brand: {
    name: "Studio Noa",
    tagline: "قصّ وصبغ وتصفيف — رمات غان",
    description: "صالون شعر نسائي في رمات غان: قصّات، صبغ وبالاياج، تصفيف بالسشوار، تمليس، تسريحات للمناسبات والعرائس. احجزي أونلاين أو أرسلي صورة عبر واتساب لعرض سعر.",
    logoIconName: "Scissors",
    faviconEmoji: "💇‍♀️",
    ogImage: `${IMG}1600948836101-f9ffda59d250${q}1200`,
    aiPersona: "أنتِ المساعدة الافتراضية لصالون شعر نسائي في رمات غان. أجيبي بدفء واختصار عن الخدمات والمدد والأسعار حسب قائمة الأسعار، واقترحي الحجز أونلاين أو إرسال صورة عبر واتساب لاستشارة الصبغ والتمليس.",
  },

  theme: presetThemePeluqueria,

  hero: {
    titlePrefix: "الستوديو",
    titleHighlight: "لشعرك",
    titleSuffix: "في رمات غان",
    eyebrow: "صالون نسائي",
    subtitle: "قصّ، صبغ، تصفيف وتسريحات للمناسبات. احجزي أونلاين أو أرسلي صورة عبر واتساب.",
    ctaPrimary: "احجزي موعدًا",
    ctaSecondary: "استشارة عبر واتساب",
    backgroundImage: `${IMG}1600948836101-f9ffda59d250${q}2000`,
  },

  contact: {
    address: {
      street: "شارع بياليك 24",
      district: "مركز رمات غان",
      cityStateZip: "رمات غان، 5245204",
    },
    phone: "03-612-4477",
    email: "hello@studionoa.co.il",
    social: {
      instagram: "https://instagram.com/studionoa.hair",
    },
  },

  hours: {
    sunday: { start: "09:00", end: "20:00" },
    monday: { start: "09:00", end: "20:00" },
    tuesday: { start: "09:00", end: "20:00" },
    wednesday: { start: "09:00", end: "20:00" },
    thursday: { start: "09:00", end: "20:00" },
    friday: { start: "08:00", end: "14:00" },
    saturday: null,
  },

  // ─── Catálogo PEL (12) — services[i] ↔ sections.services.images[i] ────────
  services: [
    { id: "cut", name: "قصّة شعر نسائية", description: "استشارة قصيرة، غسيل، قصّة دقيقة وتجفيف. لكل طول ولكل ملمس.", duration: 60, price: 120, priceMax: 350, mode: "reserva" },
    { id: "cut-blowdry", name: "قصّة + تصفيف", description: "قصّة كاملة مع تصفيف بالسشوار في النهاية — تخرجين جاهزة.", duration: 90, price: 150, priceMax: 450, mode: "reserva" },
    { id: "blowdry", name: "تصفيف بالسشوار", description: "غسيل وتصفيف ناعم أو مموّج. السعر حسب طول الشعر.", duration: 45, price: 50, priceMax: 160, mode: "reserva" },
    { id: "root-color", name: "صبغ الجذور", description: "تغطية الجذور بصبغة احترافية، يشمل الغسيل والتجفيف. يُنصح به كل 4–6 أسابيع.", duration: 90, price: 130, priceMax: 300, mode: "reserva" },
    { id: "full-color", name: "صبغ كامل", description: "لون موحّد من الجذور حتى الأطراف، مع علاج ترطيب في النهاية.", duration: 120, price: 180, priceMax: 600, mode: "reserva" },
    { id: "highlights", name: "هايلايت / بالاياج", description: "تفتيح متدرّج وانتقالات طبيعية. السعر حسب الطول والكثافة وحالة الشعر — أرسلي صورة ونعود إليكِ بعرض.", duration: 180, price: 600, priceMax: 1500, mode: "consulta", popular: true },
    { id: "straightening", name: "تمليس (كيراتين / عضوي)", description: "يدوم 4–6 أشهر. المدة والسعر حسب الطول وحالة الشعر — تلزم استشارة مسبقة.", duration: 240, price: 600, priceMax: 2500, mode: "consulta" },
    { id: "treatment", name: "علاج شعر (ترطيب / ترميم)", description: "علاج عميق للشعر الجاف أو التالف أو بعد الصبغ. يشمل التصفيف.", duration: 60, price: 580, priceMax: 1100, mode: "reserva" },
    { id: "event-style", name: "تسريحة مناسبة", description: "رفعة، تمويج أو تسريحة ناعمة للمناسبة. يُفضّل الحضور بشعر مغسول من اليوم السابق.", duration: 90, price: 250, priceMax: 800, mode: "reserva" },
    { id: "bride", name: "تسريحة عروس + تجربة", description: "جلسة تجربة وتسريحة يوم الزفاف. السعر حسب التسريحة والموقع — نتفق هاتفيًا.", duration: 120, price: 800, priceMax: 2500, mode: "consulta" },
    { id: "kids-cut", name: "قصّة أطفال", description: "قصّات للأطفال حتى 12 سنة، بصبر، في ساعات الصباح الهادئة.", duration: 30, price: 86, priceMax: 216, mode: "reserva" },
    { id: "consult", name: "استشارة وتشخيص", description: "10–15 دقيقة لتشخيص الشعر والتخطيط للصبغ أو التمليس أو تغيير كبير. تُخصم من العلاج.", duration: 15, price: 0, priceMax: 250, mode: "reserva" },
  ],

  staff: [
    {
      id: "noa",
      slug: "noa-levi",
      name: "نوعا ليفي",
      photoUrl: `${IMG}1544717305-2782549b5136${q}800`,
      specialty: "صبغ، بالاياج وتفتيح",
      bio: "صاحبة الستوديو. 14 سنة في الصبغ والتفتيح، مع تركيز على الانتقالات الطبيعية وشعر يبقى صحيًا بعد اللون.",
      portfolio: [
        `${IMG}1492106087820-71f1a00d2b11${q}1200`,
        `${IMG}1470259078422-826894b933aa${q}1200`,
        `${IMG}1508214751196-bcfd4ca60f91${q}1200`,
        `${IMG}1524502397800-2eeaad7c3fe5${q}1200`,
      ],
      social: { instagram: "https://instagram.com/noa.color" },
      schedule: { sunday: WEEKDAY, monday: WEEKDAY, tuesday: WEEKDAY, wednesday: WEEKDAY, thursday: WEEKDAY, friday: FRIDAY, saturday: CLOSED },
    },
    {
      id: "maya",
      slug: "maya-cohen",
      name: "مايا كوهين",
      photoUrl: `${IMG}1531746020798-e6953c6e8e04${q}800`,
      specialty: "قصّات وشعر مجعّد",
      bio: "قصّات حسب الملمس — والتجاعيد قبل كل شيء. تقصّ على الجاف عند الحاجة وتعلّمكِ الحفاظ على النتيجة في البيت.",
      portfolio: [
        `${IMG}1519699047748-de8e457a634e${q}1200`,
        `${IMG}1562322140-8baeececf3df${q}1200`,
        `${IMG}1616683693504-3ea7e9ad6fec${q}1200`,
        `${IMG}1580618672591-eb180b1a973f${q}1200`,
      ],
      social: { instagram: "https://instagram.com/maya.curls" },
      schedule: { sunday: WEEKDAY, monday: WEEKDAY, tuesday: CLOSED, wednesday: WEEKDAY, thursday: WEEKDAY, friday: FRIDAY, saturday: CLOSED },
    },
    {
      id: "dana",
      slug: "dana-mizrahi",
      name: "دانا مزراحي",
      photoUrl: `${IMG}1508214751196-bcfd4ca60f91${q}800`,
      specialty: "تسريحات مناسبات وعرائس",
      bio: "تسريحات تصمد حتى آخر الليل. تجربة لكل عروس، والحضور إلى الموقع يوم المناسبة.",
      portfolio: [
        `${IMG}1560869713-7d0a29430803${q}1200`,
        `${IMG}1519741497674-6114818635${q}1200`,
        `${IMG}1523263685509-57c1d050d19b${q}1200`,
        `${IMG}1502823403499-6ccfcf4fb453${q}1200`,
      ],
      social: { instagram: "https://instagram.com/dana.updo" },
      schedule: { sunday: CLOSED, monday: WEEKDAY, tuesday: WEEKDAY, wednesday: WEEKDAY, thursday: WEEKDAY, friday: FRIDAY, saturday: CLOSED },
    },
  ],

  testimonials: [
    { name: "شيرا ب.", title: "تقييم غوغل", text: "أرسلت صورة عبر واتساب، قالت لي نوعا بالضبط ما الممكن وما غير الممكن، وخرج البالاياج تمامًا مثل الصورة. بقي شعري ناعمًا بعد التفتيح.", rating: 5 },
    { name: "نيطع ك.", title: "تقييم غوغل", text: "أخيرًا من تفهم التجاعيد. قصّت مايا على الجاف، وشرحت ماذا أفعل في البيت، ولأول مرة أخرج من الصالون دون أن أربط شعري.", rating: 5 },
    { name: "ميخال أ.", title: "تقييم غوغل", text: "تسريحة لزفاف أختي — تجربة قبل أسبوع، وفي اليوم نفسه كل شيء في موعده. صمدت حتى الرابعة فجرًا.", rating: 5 },
  ],

  gallery: [
    `${IMG}1470259078422-826894b933aa${q}1200`,
    `${IMG}1492106087820-71f1a00d2b11${q}1200`,
    `${IMG}1508214751196-bcfd4ca60f91${q}1200`,
    `${IMG}1519699047748-de8e457a634e${q}1200`,
    `${IMG}1524502397800-2eeaad7c3fe5${q}1200`,
    `${IMG}1616683693504-3ea7e9ad6fec${q}1200`,
    `${IMG}1562322140-8baeececf3df${q}1200`,
    `${IMG}1580618672591-eb180b1a973f${q}1200`,
    `${IMG}1595476108010-b4d1f102b1b1${q}1200`,
    `${IMG}1634449571010-02389ed0f9b0${q}1200`,
    `${IMG}1600948836101-f9ffda59d250${q}1200`,
    `${IMG}1521590832167-7bcbfaa6381f${q}1200`,
  ],

  sections: {
    services: {
      title: "ماذا نقدّم",
      subtitle: "الخدمات والأسعار",
      images: [
        `${IMG}1562322140-8baeececf3df${q}600`,
        `${IMG}1580618672591-eb180b1a973f${q}600`,
        `${IMG}1560869713-7d0a29430803${q}600`,
        `${IMG}1595476108010-b4d1f102b1b1${q}600`,
        `${IMG}1492106087820-71f1a00d2b11${q}600`,
        `${IMG}1524502397800-2eeaad7c3fe5${q}600`,
        `${IMG}1470259078422-826894b933aa${q}600`,
        `${IMG}1620331311520-246422fd82f9${q}600`,
        `${IMG}1508214751196-bcfd4ca60f91${q}600`,
        `${IMG}1519741497674-611481863552${q}600`,
        `${IMG}1503454537195-1dcabb73ffb9${q}600`,
        `${IMG}1595475884562-073c30d45670${q}600`,
      ],
    },
    team: {
      title: "الفريق",
      subtitle: "من تعتني بكِ",
      description: "لكل واحدة تخصصها — لون، تجاعيد أو مناسبات. اختاري المصفّفة عند الحجز.",
    },
    whyChooseUs: {
      title: "لماذا نحن",
      subtitle: "باختصار",
      mainImage: `${IMG}1521590832167-7bcbfaa6381f${q}1000`,
      badge: "استشارة\nقبل الصبغ",
      benefits: [
        { iconName: "MessageCircle", title: "استشارة أولًا، بلا مفاجآت", desc: "أرسلي صورة عبر واتساب واحصلي على عرض سعر قبل أن تجلسي على الكرسي." },
        { iconName: "Palette", title: "أسعار واضحة", desc: "نطاق سعر لكل خدمة، وما يُحدَّد فقط بعد التشخيص." },
        { iconName: "Clock", title: "في الموعد", desc: "حجز أونلاين، تذكير قبل يوم، وصفر انتظار عند الباب." },
        { iconName: "Sparkles", title: "صحة الشعر أولًا", desc: "التفتيح والتمليس فقط إذا كان شعرك يتحمّل ذلك." },
      ],
    },
    testimonials: {
      title: "تقييمات",
      subtitle: "ماذا يقلن عنا",
    },
    gallery: {
      title: "من كرسينا",
      subtitle: "أعمالنا",
    },
    location: {
      title: "رمات غان",
      subtitle: "أين نحن",
    },
    contact: {
      title: "تواصلي معنا",
      subtitle: "احجزي أو اسألي",
      description: "حجز أونلاين للخدمات ذات السعر الثابت؛ للصبغ المعقّد أو التمليس أو العروس — أرسلي صورة عبر واتساب ونعود إليكِ بعرض.",
    },
    booking: {
      title: "حجز موعد",
      tagline: "قصّ وصبغ وتصفيف — رمات غان",
      steps: {
        service: "الخدمة",
        staff: "المصفّفة",
        datetime: "الموعد",
        details: "التفاصيل",
        payment: "الدفع",
      },
      aiConsultant: {
        title: "غير متأكدة ماذا تختارين؟",
        subtitle: "نصيحة سريعة",
        description: "أخبرينا عن شعرك وما تريدين، وسنقترح الخدمة المناسبة.",
        agentLabel: "نصيحة",
        placeholder: "مثلًا: شعر طويل مصبوغ، أريد تفتيحه دون إتلافه...",
      },
      success: {
        title: "تم الحجز",
        confirmed: "تم تأكيد الموعد!",
        requestSaved: "تم حفظ الطلب!",
        cancelled: "أُلغي",
      },
    },
    instagram: {
      title: "تابعي أعمالنا",
      handle: "@studionoa.hair",
      url: "https://instagram.com/studionoa.hair",
      images: [
        `${IMG}1470259078422-826894b933aa?w=400&h=400&fit=crop`,
        `${IMG}1492106087820-71f1a00d2b11?w=400&h=400&fit=crop`,
        `${IMG}1519699047748-de8e457a634e?w=400&h=400&fit=crop`,
        `${IMG}1616683693504-3ea7e9ad6fec?w=400&h=400&fit=crop`,
        `${IMG}1580618672591-eb180b1a973f?w=400&h=400&fit=crop`,
        `${IMG}1600948836101-f9ffda59d250?w=400&h=400&fit=crop`,
      ],
    },
    admin: {
      staff: {
        title: "الفريق",
        scheduleTitle: "التوفر الأسبوعي",
        commitButton: "حفظ الجدول",
        enforcementTitle: "تطبيق التوفر",
        enforcementDesc: "تُطبَّق الجداول فورًا: أي تغيير في التوفر أو حجب يوم يسري مباشرة ويمنع ازدواج المواعيد.",
      },
    },
    faq: {
      title: "أسئلة شائعة",
      subtitle: "قبل الحجز",
      items: [
        { question: "كم تستغرق كل خدمة؟", answer: "قصّة 45–60 دقيقة؛ تصفيف 30–45؛ جذور 60–90؛ صبغ كامل حتى ساعتين؛ هايلايت وبالاياج 2.5–3.5 ساعة؛ تمليس 3–5 ساعات حسب الطول والحالة؛ تسريحة مناسبة 45–90 دقيقة." },
        { question: "كيف ألغي موعدًا أو أنقله؟", answer: "عبر الرابط في رسالة التأكيد أو واتساب أو الهاتف — مجانًا حتى 24 ساعة قبل الموعد. الإلغاء المتأخر أو عدم الحضور قد يُحتسب 50% من سعر الخدمة." },
        { question: "كيف أدفع؟", answer: "نقدًا أو ببطاقة أو عبر Bit في الصالون. للتمليس والبالاياج الكامل وتسريحة العروس نطلب عربونًا عند الحجز." },
        { question: "لماذا لا يوجد سعر نهائي للهايلايت والتمليس؟", answer: "لأنه يعتمد على الطول والكثافة وحالة الشعر (مصبوغ؟ مملّس سابقًا؟). أرسلي صورة لشعرك في ضوء النهار عبر واتساب ونعود بعرض — أو احجزي استشارة 10–15 دقيقة." },
        { question: "هل تقصّون شعر الأطفال؟", answer: "نعم، حتى 12 سنة. يُفضّل صباحًا حين يكون الصالون هادئًا." },
        { question: "هل توجد متخصصة في التجاعيد؟", answer: "نعم — مايا. اختاريها عند الحجز وتعالي بشعرك كما هو في يومك العادي." },
      ],
    },
  },
};
