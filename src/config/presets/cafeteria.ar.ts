import type { NichePreset } from "../../types";
import { presetThemeCafeteria } from "./themes";

export const cafeteriaPresetAr: NichePreset = {
  businessMode: "team",
  business: {
    type: "cafeteria",
    legalName: "Aroma Vivo Coffee LLC",
    address: "Av. del Libertador 2840, Palermo, Buenos Aires, Argentina",
    cancellationPolicy: "قبل 24 ساعة من الموعد",
  },

  brand: {
    name: "Aroma Vivo",
    tagline: "قهوة مختصة محمّصة بعناية على دفعات صغيرة",
    description: "قهوة مختصة محمّصة بشغف وإتقان. كل فنجان هو طقس من النكهة والحرفية.",
    logoIconName: "Coffee",
    faviconEmoji: "☕",
    aiPersona: "أنت باريستا افتراضي وخبير قهوة. ساعد الزبائن في استكشاف قائمتنا، والتعرّف على طريقة التحميص، وإيجاد المشروب المثالي لذوقهم. كن دائمًا ودودًا وعلى دراية.",
  },

  theme: presetThemeCafeteria,

  hero: {
    titlePrefix: "Aroma",
    titleHighlight: "Vivo",
    titleSuffix: "قهوة مختصة · تحميص حرفي",
    subtitle: "كل فنجان يروي حكاية. دع القهوة تتحدث قبل رشفتك الأولى.",
    ctaPrimary: "استكشف قائمتنا",
    ctaSecondary: "طريقتنا",
    backgroundImage: "https://images.unsplash.com/photo-1445116572660-236099ec97a0?auto=format&fit=crop&q=80&w=2000",
  },

  contact: {
    address: {
      street: "شارع روتشيلد 42",
      district: "تل أبيب",
      cityStateZip: "تل أبيب، إسرائيل",
    },
    phone: "+972-3-555-1234",
    email: "hello@aromavivo.co.il",
    social: {
      instagram: "https://instagram.com/aromavivocafe",
      facebook: "https://facebook.com/aromavivocafe",
    },
  },

  hours: {
    monday: { start: "07:00", end: "20:00" },
    tuesday: { start: "07:00", end: "20:00" },
    wednesday: { start: "07:00", end: "20:00" },
    thursday: { start: "07:00", end: "20:00" },
    friday: { start: "07:00", end: "15:00" },
    saturday: null,
    sunday: { start: "07:00", end: "20:00" },
  },

  services: [
    { id: "espresso", name: "Espresso كلاسيكي", subtitle: "الروح الصافية", description: "كثيف، كريمي، وممتلئ القوام. جرعة مزدوجة تكشف عن كامل شخصية حبة البن.", duration: 0, price: 0, category: "hot", image: "/images/menu/espresso.jpg" },
    { id: "cappuccino", name: "Cappuccino ناعم", subtitle: "سحابة من الرغوة", description: "رغوة حريرية فوق Espresso مزدوج، بفقاعات دقيقة تذوب على اللسان.", duration: 0, price: 0, category: "hot", image: "/images/menu/cappuccino.jpg" },
    { id: "flat-white", name: "Flat White", subtitle: "حرير سائل", description: "رغوة مصغّرة مثالية فوق ريستريتو مزدوج. المفضّل لدى عشّاق القهوة الحقيقيين.", duration: 0, price: 0, category: "hot", image: "/images/menu/flatwhite.jpg" },
    { id: "cold-brew", name: "Cold Brew", subtitle: "صبر بارد", description: "استخلاص بارد لمدة 12 ساعة. ناعم، حلو، ومنعش بنقاء.", duration: 0, price: 0, category: "cold", image: "/images/menu/coldbrew.jpg" },
    { id: "iced-latte", name: "Iced Latte", subtitle: "ثلج وشغف", description: "حليب كريمي وEspresso متوازن فوق الثلج. منعش تمامًا.", duration: 0, price: 0, category: "cold", image: "/images/menu/icedlatte.jpg" },
    { id: "frappe-moka", name: "Frappe Moka", subtitle: "متعة حلوة", description: "قهوة وشوكولاتة وكريمة مخفوقة ممزوجة في مشروب بنكهة الحلوى.", duration: 0, price: 0, category: "cold", image: "/images/menu/frappemoka.jpg" },
    { id: "tiramisu", name: "Tiramisu منزلي", subtitle: "طبقات من الفرح", description: "طبقات من القهوة والماسكاربوني والكاكاو. وصفة عائلية أُتقنت بعناية.", duration: 0, price: 0, category: "desserts", image: "/images/menu/tiramisu.jpg" },
    { id: "cheesecake", name: "Cheesecake بالكراميل", subtitle: "توازن حلو", description: "قاعدة بسكويت وجبنة كريمية وصوص كراميل مملّح.", duration: 0, price: 0, category: "desserts", image: "/images/menu/cheesecake.jpg" },
  ],

  staff: [
    { id: "lucas", slug: "lucas-fernandez", name: "Lucas Fernandez", specialty: "باريستا رئيسي ومؤسس", bio: "بطل وطني سابق في فن اللاتيه مع 10 سنوات خبرة في القهوة المختصة.", photoUrl: "https://images.unsplash.com/photo-1577219491135-ce391730fb2c?auto=format&fit=crop&q=80&w=800", portfolio: [], schedule: { monday: { isOpen: true, hours: { start: "07:00", end: "20:00" }, breaks: [] }, tuesday: { isOpen: true, hours: { start: "07:00", end: "20:00" }, breaks: [] }, wednesday: { isOpen: true, hours: { start: "07:00", end: "20:00" }, breaks: [] }, thursday: { isOpen: true, hours: { start: "07:00", end: "20:00" }, breaks: [] }, friday: { isOpen: true, hours: { start: "07:00", end: "15:00" }, breaks: [] }, saturday: { isOpen: false, hours: { start: "09:00", end: "18:00" }, breaks: [] }, sunday: { isOpen: true, hours: { start: "07:00", end: "20:00" }, breaks: [] } } },
    { id: "martina", slug: "martina-lopez", name: "Martina Lopez", specialty: "باريستا أولى", bio: "متخصصة في الاستخلاص وCold Brew بذوق مدرّب عالي المستوى.", photoUrl: "https://images.unsplash.com/photo-1554151228-14d9def656e4?auto=format&fit=crop&q=80&w=800", portfolio: [], schedule: { monday: { isOpen: true, hours: { start: "07:00", end: "20:00" }, breaks: [] }, tuesday: { isOpen: true, hours: { start: "07:00", end: "20:00" }, breaks: [] }, wednesday: { isOpen: true, hours: { start: "07:00", end: "20:00" }, breaks: [] }, thursday: { isOpen: true, hours: { start: "07:00", end: "20:00" }, breaks: [] }, friday: { isOpen: true, hours: { start: "07:00", end: "15:00" }, breaks: [] }, saturday: { isOpen: false, hours: { start: "09:00", end: "18:00" }, breaks: [] }, sunday: { isOpen: true, hours: { start: "07:00", end: "20:00" }, breaks: [] } } },
    { id: "santiago", slug: "santiago-ruiz", name: "Santiago Ruiz", specialty: "محمّص", bio: "حرفي النار الهادئة يتعامل مع كل دفعة تحميص وكأنها قطعة فنية.", photoUrl: "https://images.unsplash.com/photo-1600565193348-f74bd3c7ccdf?auto=format&fit=crop&q=80&w=800", portfolio: [], schedule: { monday: { isOpen: true, hours: { start: "07:00", end: "20:00" }, breaks: [] }, tuesday: { isOpen: true, hours: { start: "07:00", end: "20:00" }, breaks: [] }, wednesday: { isOpen: true, hours: { start: "07:00", end: "20:00" }, breaks: [] }, thursday: { isOpen: true, hours: { start: "07:00", end: "20:00" }, breaks: [] }, friday: { isOpen: true, hours: { start: "07:00", end: "15:00" }, breaks: [] }, saturday: { isOpen: false, hours: { start: "09:00", end: "18:00" }, breaks: [] }, sunday: { isOpen: true, hours: { start: "07:00", end: "20:00" }, breaks: [] } } },
  ],

  testimonials: [
    { name: "فالنتينا ر.", title: "زبونة دائمة", text: "أفضل Espresso تذوّقته. تشعر أنهم يختارون الحبوب بعناية ويستخلصون بإتقان.", rating: 5 },
    { name: "مارتين ل.", title: "زائر صباحي", text: "آتي كل صباح قبل العمل. الFlat White عندهم لا يُقاوم. الأجواء تجعلك ترغب بالبقاء طوال اليوم.", rating: 5 },
    { name: "كاميلا س.", title: "زائرة نهاية أسبوع", text: "أحضرني شريكي لتجربة Cold Brew وأصبحنا الآن زبائن دائمين. الTiramisu بمستوى آخر تمامًا.", rating: 5 },
    { name: "أندريس ب.", title: "عامل عن بُعد", text: "أعمل عن بُعد وهذا مكاني المفضّل. إنترنت سريع، مقابس كهرباء، قهوة ممتازة، وأجواء هادئة نادرة.", rating: 5 },
    { name: "صوفيا م.", title: "زبونة جديدة", text: "اكتشفت Aroma Vivo على خرائط جوجل والصور لم تكذب. جودة القهوة والخدمة تفوق التوقعات.", rating: 5 },
  ],

  gallery: [
    "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&q=80&w=800",
    "https://images.unsplash.com/photo-1442512595331-e89e73853f31?auto=format&fit=crop&q=80&w=800",
    "https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&q=80&w=800",
    "https://images.unsplash.com/photo-1498804103079-a6351b050096?auto=format&fit=crop&q=80&w=800",
  ],

  sections: {
    services: { title: "قائمتنا", subtitle: "إبداعات مميّزة صُنعت بعناية", images: [] },
    team: { title: "من نحن", subtitle: "أيادٍ تصنع السحر", description: "حرفيون شغوفون مكرّسون لفن القهوة المختصة." },
    whyChooseUs: {
      title: "ما يميّزنا",
      subtitle: "ما الذي يجعل كل فنجان مميّزًا",
      benefits: [
        { title: "حبوب أحادية المصدر", desc: "نستورد من أفضل المزارع في كولومبيا وإثيوبيا والبرازيل.", iconName: "Leaf" },
        { title: "تحميص بدفعات صغيرة", desc: "كل دفعة تُحمّص يدويًا لإبراز أقصى تعبير عن النكهة.", iconName: "Flame" },
        { title: "باريستا خبراء", desc: "أذواق مدرّبة تُعاير كل استخلاص بدقة متناهية.", iconName: "Award" },
        { title: "أجواء هادئة", desc: "مصمّم ليكون كل زيارة بمثابة استراحة واعية ومقصودة.", iconName: "Sun" },
      ],
      mainImage: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&q=80&w=800",
      badge: "قهوة مختصة",
    },
    testimonials: { title: "ماذا يقول زبائننا", subtitle: "4.9 على خرائط جوجل" },
    gallery: { title: "مساحتنا", subtitle: "ملاذ لحواسك" },
    location: { title: "زوروونا", subtitle: "فنجانكم بانتظاركم" },
    contact: { title: "تواصلوا معنا", subtitle: "يسعدنا سماعكم", description: "سواء كان لديكم سؤال عن القائمة أو الفعاليات أو القهوة بالجملة، راسلونا." },
    booking: {
      title: "احجز طاولة",
      tagline: "للمجموعات والمناسبات الخاصة",
      steps: { service: "نوع الفعالية", staff: "المضيف", datetime: "التاريخ والوقت", details: "بياناتك", payment: "تأكيد" },
      aiConsultant: { title: "دليل القهوة", subtitle: "غير متأكد ماذا تطلب؟", description: "باريستا الذكاء الاصطناعي لدينا يمكنه اقتراح المشروب المثالي بناءً على ذوقك.", agentLabel: "باريستا AI", placeholder: "أي نوع قهوة تفضّل؟" },
      success: { title: "تم تأكيد الحجز", confirmed: "طاولتكم ستكون جاهزة!", requestSaved: "تم حفظ طلبك.", cancelled: "تم إلغاء الحجز." },
    },
    admin: { staff: { title: "إدارة الفريق", scheduleTitle: "الجداول", commitButton: "حفظ التغييرات", enforcementTitle: "قواعد الورديات", enforcementDesc: "ضبط جدول توفّر الفريق." } },
    philosophy: {
      title: "جوهرنا",
      subtitle: "أكثر من فنجان، إنه طقس",
      intro: "نؤمن بأن القهوة طقس يستحق الوقت والاهتمام والاحترام. من الحبة إلى الفنجان، كل خطوة هي قرار واعٍ نحو التميّز.",
      pillars: [
        { number: "01", title: "المصدر", description: "نختار حبوبنا من مزارع مستدامة في ارتفاعات ومناخات مثالية لبناء نكهات فريدة." },
        { number: "02", title: "التحميص", description: "كل دفعة تُحمّص يدويًا بكميات صغيرة، محافظين على شخصية كل مصدر دون اختصارات." },
        { number: "03", title: "الاستخلاص", description: "يوازن الباريستا لدينا بين الحلاوة والحموضة والقوام لالتقاط أفضل تعبير عن كل حبة." },
      ],
    },
    process: {
      title: "من المزرعة إلى الفنجان",
      subtitle: "مسار واعٍ",
      intro: "هذا أكثر من مجرد قهوة. إنها سلسلة قرارات مدروسة تحترم الحبة والمزارع والشخص الذي يشربها.",
      steps: [
        { number: "01", title: "الانتقاء", description: "نختار حبوبًا من أفضل المزارع في كولومبيا وإثيوبيا والبرازيل. فقط أفضل 1% تجتاز معاييرنا." },
        { number: "02", title: "تحميص حرفي", description: "كل دفعة تُحمّص يدويًا مع مراقبة دقيقة لدرجة الحرارة والوقت." },
        { number: "03", title: "راحة مضبوطة", description: "تستريح الحبوب 48 ساعة في غرفة محكمة المناخ حتى تستقر الزيوت وتتركّز النكهات." },
        { number: "04", title: "استخلاص مثالي", description: "يُعاير الباريستا لدينا الحرارة والطحن والضغط لاستخراج الأفضل من كل مصدر." },
      ],
    },
    ambience: {
      title: "المكان",
      subtitle: "ملاذ لحواسك",
      intro: "مصمّم ليشعرك كل زيارة بأنها استراحة مقصودة — من لحظة عبورك العتبة، يتغيّر الإيقاع.",
      sectors: [
        { label: "القاعة الرئيسية", body: "ضوء يغمر المكان من الأرض حتى السقف فوق طاولات بلّوط فاتحة ومقاعد وثيرة. لا شيء ينافس العبير القادم من البار.", imageSrc: "https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&q=80&w=800" },
        { label: "بار القهوة", body: "بار القهوة يتوسّط المكان — ليس كحاجز، بل كمسرح. شاهد الوزن والطحن والصب دون أن تشعر بأي استعجال.", imageSrc: "https://images.unsplash.com/photo-1453614512568-c4024d13c247?auto=format&fit=crop&q=80&w=800" },
        { label: "الزوايا الهادئة", body: "على الأطراف، زوايا مختبئة بمصابيح دافئة ترحّب بالحواسيب والدفاتر أو الحديث الهادئ.", imageSrc: "https://images.unsplash.com/photo-1521017432531-fbd92d768814?auto=format&fit=crop&q=80&w=800" },
      ],
    },
    menu: {
      title: "قائمتنا",
      subtitle: "إبداعات مميّزة صُنعت بعناية",
      categories: [
        { key: "all", label: "الكل" },
        { key: "hot", label: "ساخن" },
        { key: "cold", label: "بارد" },
        { key: "desserts", label: "حلويات" },
      ],
      items: [
        { id: "espresso", name: "Espresso كلاسيكي", subtitle: "الروح الصافية", description: "كثيف، كريمي، وممتلئ القوام. جرعة مزدوجة تكشف عن كامل شخصية حبة البن.", category: "hot", image: "https://images.unsplash.com/photo-1510707577719-ae7c14805e3a?auto=format&fit=crop&q=80&w=600" },
        { id: "cappuccino", name: "Cappuccino ناعم", subtitle: "سحابة من الرغوة", description: "رغوة حريرية فوق Espresso مزدوج، بفقاعات دقيقة تذوب على اللسان.", category: "hot", image: "https://images.unsplash.com/photo-1572442388796-11668a67e53d?auto=format&fit=crop&q=80&w=600" },
        { id: "flat-white", name: "Flat White", subtitle: "حرير سائل", description: "رغوة مصغّرة مثالية فوق ريستريتو مزدوج. المفضّل لدى عشّاق القهوة الحقيقيين.", category: "hot", image: "https://images.unsplash.com/photo-1577968897966-3d4325b36b61?auto=format&fit=crop&q=80&w=600" },
        { id: "cold-brew", name: "Cold Brew", subtitle: "صبر بارد", description: "استخلاص بارد لمدة 12 ساعة. ناعم، حلو، ومنعش بنقاء.", category: "cold", image: "https://images.unsplash.com/photo-1461023058943-07fcbe16d735?auto=format&fit=crop&q=80&w=600" },
        { id: "iced-latte", name: "Iced Latte", subtitle: "ثلج وشغف", description: "حليب كريمي وEspresso متوازن فوق الثلج. منعش تمامًا.", category: "cold", image: "https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?auto=format&fit=crop&q=80&w=600" },
        { id: "frappe-moka", name: "Frappe Moka", subtitle: "متعة حلوة", description: "قهوة وشوكولاتة وكريمة مخفوقة ممزوجة في مشروب بنكهة الحلوى.", category: "cold", image: "https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&q=80&w=600" },
        { id: "tiramisu", name: "Tiramisu منزلي", subtitle: "طبقات من الفرح", description: "طبقات من القهوة والماسكاربوني والكاكاو. وصفة عائلية أُتقنت بعناية.", category: "desserts", image: "https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?auto=format&fit=crop&q=80&w=600" },
        { id: "cheesecake", name: "Cheesecake بالكراميل", subtitle: "توازن حلو", description: "قاعدة بسكويت وجبنة كريمية وصوص كراميل مملّح.", category: "desserts", image: "https://images.unsplash.com/photo-1533134242443-d4fd215305ad?auto=format&fit=crop&q=80&w=600" },
      ],
    },
    faq: {
      title: "أسئلة شائعة",
      subtitle: "من الجيد معرفتها قبل الزيارة",
      items: [
        { question: "هل تقبلون حجوزات؟", answer: "نعمل بنظام أسبقية الحضور للجلسات العادية. للمجموعات من 6 أشخاص فأكثر، يُرجى الاتصال مسبقًا." },
        { question: "هل لديكم خيارات نباتية أو خالية من الغلوتين؟", answer: "نعم! لدينا خيارات مُعلّمة بوضوح للنباتيين وللأنظمة الخالية من الغلوتين." },
        { question: "هل يوجد Wi-Fi؟", answer: "Wi-Fi مجاني وسريع متاح لجميع الزوار. اطلبوا كلمة المرور من الفريق." },
        { question: "هل يمكنني إحضار حاسوبي والعمل هنا؟", answer: "بالتأكيد! لدينا مقابس كهرباء وزاوية هادئة مخصّصة للعاملين عن بُعد." },
      ],
    },
  },
};
