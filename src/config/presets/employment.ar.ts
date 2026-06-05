import type { NichePreset } from "../../types";
import { presetThemeEmployment } from "./themes";

export const employmentPresetAr: NichePreset = {
  businessMode: "solo",
  business: {
    type: "employment",
    legalName: "لكت غريغوري — وكالة توظيف",
    address: "شارع بياليك 44، عسقلان، إسرائيل",
    cancellationPolicy: "",
  },

  brand: {
    name: "לכט גריגורי",
    tagline: "نربط الناس بفرص العمل",
    description:
      "لكت غريغوري متخصصة في توظيف العمال في المستودعات والسوبرماركت والتنظيف واللوجستيك والسائقين والطهي والبناء وغيرها. نحن هنا من أجلك.",
    logoIconName: "Briefcase",
    faviconEmoji: "💼",
    ogImage: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&q=80&w=1200",
    aiPersona:
      "أنت ممثل لكت غريغوري، وكالة توظيف إسرائيلية. مهمتك مساعدة الباحثين عن عمل على فهم العملية وتوجيههم للتسجيل. أجب بدفء ومهنية باللغة العربية.",
  },

  theme: presetThemeEmployment,

  hero: {
    titlePrefix: "تبحث عن",
    titleHighlight: "عمل؟",
    titleSuffix: "سنجد لك",
    subtitle:
      "لكت غريغوري تربط الباحثين عن عمل بالوظائف في جميع أنحاء إسرائيل. سجّل الآن وسنتواصل معك خلال 24 ساعة.",
    ctaPrimary: "سجّل الآن",
    ctaSecondary: "الوظائف المتاحة",
    backgroundImage:
      "https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=1920&q=80",
    stats: [
      { value: "500+", label: "عامل تم توظيفه" },
      { value: "120+", label: "شركة شريكة" },
      { value: "15+", label: "مدينة في إسرائيل" },
    ],
  },

  contact: {
    address: {
      street: "شارع بياليك 44",
      district: "عسقلان",
      cityStateZip: "عسقلان، إسرائيل",
    },
    phone: "+972-50-123-4567",
    email: "info@lektgrigori.co.il",
    social: {
      instagram: "",
      facebook: "",
      whatsapp: "https://wa.me/972501234567",
    },
  },

  hours: {
    monday: { start: "08:00", end: "18:00" },
    tuesday: { start: "08:00", end: "18:00" },
    wednesday: { start: "08:00", end: "18:00" },
    thursday: { start: "08:00", end: "18:00" },
    friday: { start: "08:00", end: "14:00" },
    saturday: null,
    sunday: { start: "08:00", end: "18:00" },
  },

  services: [],
  staff: [],

  testimonials: [
    {
      name: "داود ك.",
      title: "عامل مستودع",
      text: "بعد يومين من التسجيل بدأت العمل. أنصح به بشدة!",
      rating: 5,
    },
    {
      name: "ألينا م.",
      title: "موظفة سوبرماركت",
      text: "الفريق كان ودوداً ومحترفاً جداً. وجدوا لي عملاً قريباً من المنزل.",
      rating: 5,
    },
    {
      name: "أحمد ر.",
      title: "سائق توصيل",
      text: "خدمة ممتازة، كل شيء كان سريعاً وبسيطاً. شكراً جزيلاً!",
      rating: 5,
    },
  ],

  gallery: [],

  sections: {
    services: {
      title: "مجالات التوظيف لدينا",
      subtitle: "الوظائف المتاحة",
      images: [],
    },
    team: {
      title: "فريقنا",
      subtitle: "متخصصو التوظيف",
      description:
        "يتكوّن فريق لكت غريغوري من متخصصين ذوي خبرة في سوق العمل الإسرائيلي. نحن هنا لمساعدتك في إيجاد الوظيفة المناسبة.",
    },
    whyChooseUs: {
      title: "لماذا لكت غريغوري؟",
      subtitle: "مميزاتنا",
      mainImage:
        "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&q=80",
      badge: "أكثر من 10\nسنوات خبرة",
      benefits: [
        {
          iconName: "Zap",
          title: "توظيف سريع",
          desc: "نتواصل معك خلال 24 ساعة من التسجيل ونضع العمال في وظائف مناسبة بسرعة.",
        },
        {
          iconName: "Shield",
          title: "أصحاب عمل موثوقون",
          desc: "جميع الشركات الشريكة لدينا تخضع لفحص دقيق لضمان ظروف عمل عادلة.",
        },
        {
          iconName: "Globe",
          title: "دعم متعدد اللغات",
          desc: "نتحدث العبرية والروسية والإنجليزية والعربية — حتى لا يبقى أحد دون مساعدة.",
        },
        {
          iconName: "MapPin",
          title: "في جميع أنحاء إسرائيل",
          desc: "من عسقلان إلى حيفا — مئات الوظائف المفتوحة في جميع أنحاء البلاد.",
        },
      ],
    },
    testimonials: {
      title: "ماذا يقول عنّا الآخرون",
      subtitle: "قصص نجاح",
    },
    gallery: {
      title: "",
      subtitle: "",
    },
    location: {
      title: "أين نحن",
      subtitle: "مكتبنا",
    },
    contact: {
      title: "تواصل معنا",
      subtitle: "نحن هنا من أجلك",
      description:
        "هل لديك سؤال؟ هل تريد معرفة المزيد؟ أرسل لنا رسالة وسنرد عليك في أقرب وقت.",
    },
    booking: {
      title: "تسجيل",
      tagline: "عملية التسجيل في لكت غريغوري",
      steps: {
        service: "المجال",
        staff: "المسؤول",
        datetime: "الوقت",
        details: "التفاصيل",
        payment: "تأكيد",
      },
      aiConsultant: {
        title: "المساعد الذكي",
        subtitle: "لديك أسئلة؟",
        description:
          "اسأل مساعدنا الذكي عن الوظائف المتاحة وعملية التسجيل.",
        agentLabel: "وكيل رقمي",
        placeholder: "مثلاً: 'أبحث عن عمل في مستودع في عسقلان'...",
      },
      success: {
        title: "تم بنجاح",
        confirmed: "مؤكد!",
        requestSaved: "تم حفظ الطلب!",
        cancelled: "ملغى",
      },
    },
    admin: {
      staff: {
        title: "الموظفون",
        scheduleTitle: "الجدول الزمني",
        commitButton: "حفظ",
        enforcementTitle: "تطبيق الجدول",
        enforcementDesc: "",
      },
    },
    faq: {
      title: "الأسئلة الشائعة",
      subtitle: "كل ما تحتاج معرفته",
      items: [
        {
          question: "كيف تسير عملية التسجيل؟",
          answer:
            "الأمر بسيط! أكمل النموذج القصير وسنتصل بك خلال 24 ساعة لنفهم ما يناسبك.",
        },
        {
          question: "ما أنواع الوظائف المتاحة؟",
          answer:
            "مستودعات، سوبرماركت، تنظيف، لوجستيك، سائقون، طهي/غاسترونومي، بناء والمزيد.",
        },
        {
          question: "كم من الوقت يستغرق قبل بدء العمل؟",
          answer:
            "كثير من شركائنا يحتاجون عمالاً على الفور. بعد التسجيل، في الغالب يمكن التوظيف خلال أيام قليلة.",
        },
        {
          question: "هل أحتاج إلى خبرة سابقة؟",
          answer:
            "ليس بالضرورة. كثير من الوظائف لا تتطلب خبرة مسبقة. سنجد لك ما يناسب مهاراتك وتفضيلاتك.",
        },
        {
          question: "ما المناطق التي تغطّونها؟",
          answer:
            "نعمل في جميع أنحاء إسرائيل، مع التركيز على المنطقة الجنوبية والوسطى.",
        },
      ],
    },
    howItWorks: {
      title: "كيف يعمل ذلك",
      subtitle: "ثلاث خطوات بسيطة",
      steps: [
        {
          number: "01",
          title: "سجّل",
          description: "أكمل نموذجاً سريعاً ببياناتك وتفضيلاتك",
          iconName: "UserPlus",
        },
        {
          number: "02",
          title: "نتواصل معك",
          description:
            "يراجع فريقنا ملفك ويتواصل معك عبر واتساب أو الهاتف",
          iconName: "MessageCircle",
        },
        {
          number: "03",
          title: "ابدأ العمل",
          description: "نجد لك الوظيفة المناسبة وتبدأ في الكسب",
          iconName: "Rocket",
        },
      ],
    },
    jobCategories: {
      title: "مجالات العمل",
      subtitle: "اختر المجال الذي يهمّك",
      categories: [
        {
          id: "supermarket",
          label: "سوبرماركت",
          iconName: "ShoppingCart",
          description: "كاشيرات، رصّ بضائع، طاقم القاعة",
        },
        {
          id: "warehouse",
          label: "مستودعات",
          iconName: "Package",
          description: "فرز، تعبئة، إدارة المخزون",
        },
        {
          id: "cleaning",
          label: "تنظيف",
          iconName: "Sparkles",
          description: "مكاتب، مبانٍ، صناعي",
        },
        {
          id: "logistics",
          label: "لوجستيك",
          iconName: "Truck",
          description: "شحن، توصيل، توزيع",
        },
        {
          id: "drivers",
          label: "سائقون",
          iconName: "Car",
          description: "توصيل، نقل، بريد",
        },
        {
          id: "cooking",
          label: "طهي وغاسترونومي",
          iconName: "ChefHat",
          description: "طاقم المطبخ، تجهيزات، تقديم طعام",
        },
        {
          id: "construction",
          label: "بناء",
          iconName: "HardHat",
          description: "بناء، تجديد، بنية تحتية",
        },
        {
          id: "other",
          label: "خيارات أخرى",
          iconName: "Plus",
          description: "حراسة، زراعة، فنادق والمزيد",
        },
      ],
    },
    employmentForm: {
      title: "التسجيل للوظائف",
      subtitle: "أكمل النموذج وسنتواصل معك خلال 24 ساعة",
      steps: {
        name: {
          title: "ما اسمك؟",
          firstNameLabel: "الاسم الأول",
          lastNameLabel: "اسم العائلة",
        },
        city: {
          title: "أين تسكن؟",
          label: "المدينة",
          placeholder: "اختر مدينتك",
        },
        interest: {
          title: "ما نوع العمل الذي يهمّك؟",
        },
        experience: {
          title: "أخبرنا عن نفسك",
          experienceLabel: "لديّ خبرة عمل سابقة",
          availabilityLabel: "التوفر",
          driversLicenseLabel: "لديّ رخصة قيادة",
          languagesLabel: "اللغات التي أتحدثها",
          languages: [
            { id: "he", label: "العبرية" },
            { id: "ru", label: "الروسية" },
            { id: "en", label: "الإنجليزية" },
            { id: "ar", label: "العربية" },
            { id: "am", label: "الأمهرية" },
            { id: "fr", label: "الفرنسية" },
          ],
          availabilityOptions: [
            { id: "fulltime", label: "دوام كامل" },
            { id: "parttime", label: "دوام جزئي" },
            { id: "flexible", label: "مرن" },
          ],
        },
        contact: {
          title: "كيف يمكننا التواصل معك؟",
          phoneLabel: "رقم الهاتف",
          emailLabel: "البريد الإلكتروني (اختياري)",
        },
        summary: {
          title: "مراجعة وإرسال",
          submitLabel: "إرسال التسجيل",
          successTitle: "تم إرسال التسجيل!",
          successMessage:
            "استلمنا بياناتك. سيتواصل معك فريقنا خلال 24 ساعة.",
        },
      },
      cities: [
        "אשקלון",
        "באר שבע",
        "אשדוד",
        "תל אביב",
        "ירושלים",
        "חיפה",
        "נתניה",
        "ראשון לציון",
        "פתח תקווה",
        "חולון",
        "בני ברק",
        "רמת גן",
        "הרצליה",
        "כפר סבא",
        "רחובות",
        "לוד",
        "רמלה",
        "קריית גת",
        "עראד",
        "דימונה",
        "אילת",
        "אופקים",
        "שדרות",
        "נתיבות",
      ],
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ...({
      business: {
        hero: {
          eyebrow: "للأعمال",
          titleLine1: "عمّال موثّقون،",
          titleHighlight: "بدون صداع التوظيف",
          subtitle:
            "ركّز على عملك. نحن نقوم بالتصفية والمقابلات ونقدّم لك مرشّحين متوافقين خلال 48 ساعة — في كل أنحاء البلاد.",
          ctaPrimary: "ابدأ التوظيف",
          ctaSecondary: "كيف يعمل",
          stats: [
            { value: "500+", label: "عامل متاح" },
            { value: "120+", label: "شريك أعمال" },
            { value: "48س", label: "متوسط وقت المطابقة" },
            { value: "15+", label: "مدينة مغطّاة" },
          ],
        },
        benefits: {
          eyebrow: "لماذا نحن",
          title: "النموذج الذي يعيد لك وقتك",
          benefits: [
            { iconName: "Clock", label: "01", title: "مرشّح خلال 48 ساعة", description: "بدون ماراثون مكالمات. نبدأ التصفية فور استلام طلبك ونعرض 3–5 مرشّحين متوافقين خلال يومين." },
            { iconName: "ShieldCheck", label: "02", title: "تمّ تدقيقهم واحدًا واحدًا", description: "كل عامل يجتاز مقابلة شخصية، تحقّق هويّة ومراجع. لا ترى متقدّمين خام أبدًا." },
            { iconName: "MapPin", label: "03", title: "تغطية وطنيّة", description: "من عسقلان إلى حيفا — قاعدة عمّال نشطة في كل مناطق الصناعة والخدمات والبناء." },
            { iconName: "Headphones", label: "04", title: "مدير حساب مخصّص", description: "شخص واحد مسؤول عن حسابك. يردّ على واتساب، يتعامل مع الطوارئ ويدير الاستبدالات." },
            { iconName: "Layers", label: "05", title: "هياكل مرنة", description: "دوام كامل، جزئي، مشاريع أو بدائل لإجازات مرضيّة — نطوّع الصيغة لعملك." },
          ],
        },
        workers: {
          eyebrow: "فئات نشطة",
          title: "عمّال جاهزون لبدء المناوبة المناسبة",
          sub: "كل الفئات نشطة الآن. الأعداد تتحدّث كل صباح.",
          categories: [
            { id: "supermarket", label: "السوبر ماركت", iconName: "ShoppingCart", count: "82 متاح", description: "كاشير، تعبئة رفوف، طاقم صالة." },
            { id: "warehouse", label: "المستودعات", iconName: "Package", count: "95 متاح", description: "فرز، تغليف، جرد، تجميع طلبات." },
            { id: "cleaning", label: "التنظيف", iconName: "Sparkles", count: "120 متاح", description: "مكاتب، مبانٍ، صناعي." },
            { id: "logistics", label: "اللوجستيات", iconName: "Truck", count: "60 متاح", description: "تحميل، تفريغ، توزيع إقليمي." },
            { id: "drivers", label: "السائقون", iconName: "Car", count: "44 متاح", description: "توصيل، نقل، مراسلون." },
            { id: "cooking", label: "المطبخ والكاترينغ", iconName: "ChefHat", count: "38 متاح", description: "مساعد طاهٍ، تحضيرات، خط ساخن." },
            { id: "construction", label: "البناء", iconName: "HardHat", count: "70 متاح", description: "بناء، تشطيب، بنى تحتية." },
            { id: "other", label: "مجالات أخرى", iconName: "Plus", count: "طلب مفتوح", description: "حراسة، زراعة، فنادق." },
          ],
        },
        process: {
          eyebrow: "ثلاث خطوات",
          title: "من الطلب إلى فريق جاهز خلال أسبوع",
          steps: [
            { number: "01", iconName: "ClipboardList", title: "أخبرنا بما تحتاج", description: "نموذج قصير، أو مكالمة 10 دقائق. الدور، العدد، المنطقة، الإلحاحيّة." },
            { number: "02", iconName: "Users", title: "استلم مرشّحين متوافقين", description: "خلال 48 ساعة، 3–5 مرشّحين مدقّقين. لا سير ذاتيّة عشوائيّة — فقط مطابقات." },
            { number: "03", iconName: "Rocket", title: "ابدأ العمل", description: "تختار الشخص المناسب، نحن نُنهي الأوراق، والعامل يبدأ حسب جدولك." },
          ],
        },
        form: {
          eyebrow: "ابدأ التوظيف",
          title: "أخبرنا عن الفريق الذي تحتاجه",
          sub: "نردّ في نفس يوم العمل بخيارات مرشّحين. بدون التزام.",
          fields: {
            companyName: "اسم الشركة",
            contactName: "اسم جهة الاتصال",
            phone: "هاتف",
            email: "بريد إلكتروني",
            jobType: "نوع العمّال",
            jobTypePlaceholder: "اختر المجال",
            workerCount: "كم عاملاً",
            workerCountPlaceholder: "مثلاً 5",
            city: "المدينة / المنطقة",
            cityPlaceholder: "مثلاً عسقلان",
            urgency: "متى تبدأ",
            notes: "ملاحظات إضافيّة",
            notesPlaceholder: "تفاصيل الدور، الساعات، متطلّبات خاصّة…",
          },
          urgencyOptions: [
            { id: "immediate", label: "فوري" },
            { id: "week", label: "خلال أسبوع" },
            { id: "month", label: "خلال شهر" },
            { id: "flexible", label: "مرن" },
          ],
          submit: "إرسال الطلب",
          submitting: "جارٍ الإرسال…",
          successTitle: "تمّ استلام الطلب",
          successMessage: "سيتواصل معك مدير حساب مخصّص خلال ساعات العمل القادمة.",
          errorMessage: "حدث خطأ. حاول مرة أخرى أو اتّصل بنا مباشرة.",
        },
        testimonials: {
          eyebrow: "ما يقوله أصحاب الأعمال",
          title: "نُغلق الوظائف بدل الاجتماعات",
          items: [
            { quote: "احتياجاتنا تغيّرت فجأة — 7 عمّال خلال 4 أيام. أرسل ليخط غريغوري 12 مرشّحًا. وظّفناهم جميعًا.", author: "عنات ل.", role: "مديرة عمليّات، مستودع لوجستي في أشدود" },
            { quote: "أملك سوبر ماركت في قريات غات. كنت أهدر المال على الإعلانات. هنا أحصل على مرشّح جاهز خلال 48 ساعة من المكالمة.", author: "يوسي أ.", role: "مدير فرع سوبر ماركت" },
            { quote: "أكثر ما أعجبني أنّهم لم يُهدروا وقتي. كل مرشّح رأيته كان مناسبًا. هذا نادر.", author: "فلاد ك.", role: "مدير موقع بناء، مركز البلاد" },
          ],
        },
        faq: {
          eyebrow: "أسئلة أصحاب العمل",
          title: "كل ما يسأل عنه الأعمال",
          items: [
            { question: "هل تتولّون الأوراق؟", answer: "نعم. عقود، توثيق، تأمين، رواتب — كل ذلك في مكان واحد." },
            { question: "كم بسرعة نبدأ؟", answer: "حسب الإلحاحيّة. في الحالات العاجلة قدّمنا 5+ عمّال خلال 48 ساعة. عادةً فريق كامل خلال أسبوع." },
            { question: "ما هي المناطق التي تغطّونها؟", answer: "كل البلاد — جنوب، وسط، شمال. معظم نشاطنا في اللواء الجنوبي والوسط." },
            { question: "ماذا عن العمّال الأجانب؟", answer: "لدينا قاعدة متعدّدة اللغات: عبريّة، روسيّة، إنكليزيّة، عربيّة. كل العمّال لديهم وضع قانوني للعمل في إسرائيل." },
          ],
        },
      },
    } as any),
  },
};
