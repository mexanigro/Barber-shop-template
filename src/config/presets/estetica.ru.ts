import type { NichePreset } from "../../types";
import { presetThemeEstetica } from "./themes";

export const esteticaPresetRu: NichePreset = {
  businessMode: "team",
  business: {
    type: "estetica",
    legalName: "LUMIÈRE CLINIC LLC",
    address:
      "820 Park Avenue, Suite 4A, Upper East Side, New York, NY 10021, United States",
    cancellationPolicy: "За 24 часа до назначенной процедуры",
  },

  brand: {
    name: "LUMIÈRE CLINIC",
    tagline: "Наука естественной красоты",
    description:
      "Премиальная клиника эстетической медицины, специализирующаяся на инъекционных процедурах, продвинутых уходах за лицом и омоложении кожи. Сертифицированные специалисты, одобренные препараты и персонализированные протоколы.",
    logoIconName: "Sparkles",
    ogImage: "/og-opengraph-barber.png",
    aiPersona:
      "Вы — виртуальный консультант по коже в премиальной клинике эстетической медицины. Консультируйте клиентов с теплотой и клинической точностью, отвечайте на вопросы об инъекционных процедурах, уходах за лицом и проблемах кожи, и рекомендуйте наиболее подходящую процедуру исходя из их потребностей.",
  },

  theme: presetThemeEstetica,

  hero: {
    titlePrefix: "НАУКА",
    titleHighlight: "ЕСТЕСТВЕННОЙ",
    titleSuffix: "КРАСОТЫ",
    subtitle:
      "Сертифицированные специалисты. Одобренные препараты. Ваш путь начинается с бесплатной консультации без обязательств.",
    ctaPrimary: "Записаться на консультацию",
    ctaSecondary: "Наши процедуры",
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
      name: "Увеличение губ",
      description:
        "Деликатный объём и чёткий контур с использованием премиальной гиалуроновой кислоты. Естественный результат, без периода восстановления, мгновенный эффект.",
      duration: 45,
      price: 450,
    },
    {
      id: "cheek-filler",
      name: "Контурирование скул и подбородка",
      description:
        "Структурное моделирование перекрёстно-сшитой гиалуроновой кислотой. Восстанавливает объём, лифтингует и подчёркивает среднюю зону лица с точностью.",
      duration: 50,
      price: 550,
    },
    {
      id: "botox",
      name: "Ботокс",
      description:
        "Одобренный нейромодулятор для мимических морщин — лоб, «гусиные лапки» и межбровные складки. Деликатно, естественно, без периода восстановления.",
      duration: 30,
      price: 350,
    },
    {
      id: "facial",
      name: "Фирменный уход за лицом",
      description:
        "Индивидуальный клинический уход, сочетающий глубокое очищение, профессиональную эксфолиацию и целевые сыворотки. Мгновенное сияние.",
      duration: 60,
      price: 195,
    },
    {
      id: "skin-booster",
      name: "Скин-бустер",
      description:
        "Микроинъекции нативной гиалуроновой кислоты для глубокого увлажнения, повышения эластичности и восстановления сияния кожи изнутри.",
      duration: 45,
      price: 500,
    },
  ],

  staff: [
    {
      id: "dr-anika",
      slug: "dr-anika-chen",
      name: "Д-р Аника Чен",
      photoUrl:
        "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=800",
      specialty: "Эстетическая медицина и инъекции",
      bio: "Сертифицированный специалист по эстетической медицине с более чем 10-летним опытом в области лицевых инъекций. Д-р Чен известна философией «меньше — значит больше»: подчёркивать природные черты, не меняя индивидуальность.",
      portfolio: [
        "https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&q=80&w=1200",
        "https://images.unsplash.com/photo-1512290923902-8a9f81dc236c?auto=format&fit=crop&q=80&w=1200",
        "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&q=80&w=1200",
        "https://images.unsplash.com/photo-1519823551278-64ac92734fb1?auto=format&fit=crop&q=80&w=1200",
      ],
      social: {
        instagram: "https://instagram.com/dranikachen",
      },
      schedule: {
        monday: {
          isOpen: true,
          hours: { start: "09:00", end: "18:00" },
          breaks: [{ start: "13:00", end: "14:00", label: "Lunch" }],
        },
        tuesday: {
          isOpen: true,
          hours: { start: "09:00", end: "18:00" },
          breaks: [{ start: "13:00", end: "14:00", label: "Lunch" }],
        },
        wednesday: {
          isOpen: true,
          hours: { start: "09:00", end: "18:00" },
          breaks: [{ start: "13:00", end: "14:00", label: "Lunch" }],
        },
        thursday: {
          isOpen: true,
          hours: { start: "09:00", end: "18:00" },
          breaks: [{ start: "13:00", end: "14:00", label: "Lunch" }],
        },
        friday: {
          isOpen: true,
          hours: { start: "09:00", end: "18:00" },
          breaks: [{ start: "13:00", end: "14:00", label: "Lunch" }],
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
      name: "Мая Торрес",
      photoUrl:
        "https://images.unsplash.com/photo-1594744803329-e58b31de8bf5?auto=format&fit=crop&q=80&w=800",
      specialty: "Продвинутые уходы и здоровье кожи",
      bio: "Лицензированный медицинский косметолог с двойной сертификацией в области клинического ухода за кожей и химических пилингов. Мая разрабатывает каждый уход как протокол — системный, доказательный и адаптированный к текущему состоянию вашей кожи.",
      portfolio: [
        "https://images.unsplash.com/photo-1616394584738-fc6e612e71b9?auto=format&fit=crop&q=80&w=1200",
        "https://images.unsplash.com/photo-1601049541271-70d659f88be8?auto=format&fit=crop&q=80&w=1200",
        "https://images.unsplash.com/photo-1515377905703-c4788e51af15?auto=format&fit=crop&q=80&w=1200",
        "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&q=80&w=1200",
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
          breaks: [{ start: "13:30", end: "14:30", label: "Break" }],
        },
        wednesday: {
          isOpen: true,
          hours: { start: "10:00", end: "18:00" },
          breaks: [{ start: "13:30", end: "14:30", label: "Break" }],
        },
        thursday: {
          isOpen: true,
          hours: { start: "10:00", end: "18:00" },
          breaks: [{ start: "13:30", end: "14:30", label: "Break" }],
        },
        friday: {
          isOpen: true,
          hours: { start: "10:00", end: "18:00" },
          breaks: [{ start: "13:30", end: "14:30", label: "Break" }],
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
      name: "Дэвид Пак, дипл. медбрат",
      photoUrl:
        "https://images.unsplash.com/photo-1582750433449-648ed127bb54?auto=format&fit=crop&q=80&w=800",
      specialty: "Инъекционист и скин-бустеры",
      bio: "Дипломированный медицинский брат с углублённой подготовкой в области дермальных филлеров и скин-бустерных протоколов. Дэвид сочетает клиническую строгость с художественным чувством лицевой симметрии и пропорций.",
      portfolio: [
        "https://images.unsplash.com/photo-1612817288484-6f916006741a?auto=format&fit=crop&q=80&w=1200",
        "https://images.unsplash.com/photo-1583772096048-47cb5ca30a6f?auto=format&fit=crop&q=80&w=1200",
        "https://images.unsplash.com/photo-1560472355-536de3962603?auto=format&fit=crop&q=80&w=1200",
        "https://images.unsplash.com/photo-1631217868264-e5b90bb7e133?auto=format&fit=crop&q=80&w=1200",
      ],
      social: {
        instagram: "https://instagram.com/davidpark_aesthetics",
      },
      schedule: {
        monday: {
          isOpen: true,
          hours: { start: "09:00", end: "17:00" },
          breaks: [{ start: "12:30", end: "13:30", label: "Lunch" }],
        },
        tuesday: {
          isOpen: true,
          hours: { start: "09:00", end: "17:00" },
          breaks: [{ start: "12:30", end: "13:30", label: "Lunch" }],
        },
        wednesday: {
          isOpen: true,
          hours: { start: "09:00", end: "17:00" },
          breaks: [{ start: "12:30", end: "13:30", label: "Lunch" }],
        },
        thursday: {
          isOpen: true,
          hours: { start: "09:00", end: "17:00" },
          breaks: [{ start: "12:30", end: "13:30", label: "Lunch" }],
        },
        friday: {
          isOpen: true,
          hours: { start: "09:00", end: "17:00" },
          breaks: [{ start: "12:30", end: "13:30", label: "Lunch" }],
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
      name: "Рэйчел Ким",
      title: "Директор по маркетингу",
      text: "Я боялась выглядеть «сделанной». Д-р Чен полностью меня успокоила, и результат настолько естественный — подруги просто говорят, что я выгляжу отдохнувшей. Именно этого я и хотела.",
      rating: 5,
    },
    {
      name: "Габриэлла Сантос",
      title: "Дизайнер интерьеров",
      text: "Уходы Маи — единственные, которые действительно изменили мою кожу надолго. После трёх сеансов текстура и тон стали совершенно другими. Я — поклонница навсегда.",
      rating: 5,
    },
    {
      name: "Лорен Уитфилд",
      title: "Адвокат",
      text: "Чисто, тихо, профессионально. Без навязывания, без давления. Дэвид объяснил каждый шаг, прежде чем прикоснуться к моему лицу. Результат увеличения губ — деликатный и совершенный.",
      rating: 5,
    },
  ],

  // ─── Gallery ─────────────────────────────────────────────────────────────────
  // 12 curated clinical aesthetics images: treatments, results, clinic environment.
  gallery: [
    "https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1616394584738-fc6e612e71b9?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1512290923902-8a9f81dc236c?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1601049541271-70d659f88be8?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1515377905703-c4788e51af15?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1612817288484-6f916006741a?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1560472355-536de3962603?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1631217868264-e5b90bb7e133?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1519823551278-64ac92734fb1?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1583772096048-47cb5ca30a6f?auto=format&fit=crop&q=80&w=1200",
  ],

  sections: {
    services: {
      title: "Точные протоколы",
      subtitle: "Наши процедуры",
      // One image per service, same order as services[].
      images: [
        "https://images.unsplash.com/photo-1512290923902-8a9f81dc236c?auto=format&fit=crop&q=80&w=600",
        "https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&q=80&w=600",
        "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&q=80&w=600",
        "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&q=80&w=600",
        "https://images.unsplash.com/photo-1519823551278-64ac92734fb1?auto=format&fit=crop&q=80&w=600",
      ],
    },
    team: {
      title: "Наши специалисты",
      subtitle: "Опытные руки",
      description:
        "Сертифицированные врачи, лицензированные косметологи и дипломированные медицинские сёстры — каждый с многолетней клинической подготовкой и общей приверженностью естественным, доказательным результатам.",
    },
    whyChooseUs: {
      title: "Наш стандарт",
      subtitle: "Почему Lumière",
      mainImage:
        "https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&q=80&w=1000",
      badge: "Сертифицированные\nспециалисты",
      benefits: [
        {
          iconName: "ShieldCheck",
          title: "Одобренные препараты",
          desc: "Каждый инъекционный препарат и продукт, используемый в нашей клинике, сертифицирован. Мы никогда не идём на компромисс в вопросах безопасности и качества.",
        },
        {
          iconName: "Award",
          title: "Сертифицированные специалисты",
          desc: "Наша команда имеет профессиональные сертификаты и углублённые квалификации. Непрерывное обучение — не опция, а обязательное условие.",
        },
        {
          iconName: "HeartHandshake",
          title: "Философия естественного результата",
          desc: "Мы подчёркиваем, а не трансформируем. Каждый план процедур разработан для сохранения ваших уникальных черт — а не их стирания.",
        },
        {
          iconName: "Microscope",
          title: "Персонализированные протоколы",
          desc: "Нет двух одинаковых лиц. Каждый клиент получает индивидуальную оценку и план процедур, адаптированный к его анатомии и целям.",
        },
      ],
    },
    testimonials: {
      title: "Опыт клиентов",
      subtitle: "Отзывы",
    },
    gallery: {
      title: "До и после",
      subtitle: "Реальные результаты",
    },
    location: {
      title: "Посетите нас",
      subtitle: "Найдите нашу клинику",
    },
    contact: {
      title: "Свяжитесь с нами",
      subtitle: "Запишитесь на бесплатную консультацию",
      description:
        "Каждая процедура начинается с беседы. Запишитесь на бесплатную очную консультацию, и один из наших специалистов разработает план с учётом ваших целей.",
    },
    booking: {
      title: "Запись на процедуру",
      tagline: "Наука естественной красоты",
      steps: {
        service: "Процедура",
        staff: "Специалист",
        datetime: "Расписание",
        details: "Подтверждение",
        payment: "Оплата",
      },
      aiConsultant: {
        title: "ИИ-консультант по коже",
        subtitle: "Не знаете, с чего начать?",
        description:
          "Опишите вашу проблему с кожей, и наш ИИ-консультант предложит наиболее подходящую процедуру.",
        agentLabel: "Консультант по коже",
        placeholder:
          "Опишите вашу проблему или что вы хотите улучшить (например, «мимические морщины вокруг глаз, потеря объёма в области скул»)...",
      },
      success: {
        title: "Подтверждено",
        confirmed: "Запись оформлена!",
        requestSaved: "Заявка сохранена!",
        cancelled: "Отменено",
      },
    },
    instagram: {
      title: "Следите за результатами",
      handle: "@lumiere.clinic",
      url: "https://instagram.com/lumiere.clinic",
      images: [
        "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=400&h=400&fit=crop",
        "https://images.unsplash.com/photo-1512290923902-8a9f81dc236c?w=400&h=400&fit=crop",
        "https://images.unsplash.com/photo-1616394584738-fc6e612e71b9?w=400&h=400&fit=crop",
        "https://images.unsplash.com/photo-1595476108010-b4d1f102b1b1?w=400&h=400&fit=crop",
        "https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=400&h=400&fit=crop",
        "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=400&h=400&fit=crop",
      ],
    },
    admin: {
      staff: {
        title: "Справочник специалистов",
        scheduleTitle: "Недельное расписание",
        commitButton: "Сохранить расписание",
        enforcementTitle: "Контроль доступности",
        enforcementDesc:
          "Расписание специалистов контролируется в режиме реального времени. Изменения доступности или заблокированных дней вступают в силу немедленно, предотвращая двойные записи.",
      },
    },
    faq: {
      title: "Часто задаваемые вопросы",
      subtitle: "Что хотят знать наши клиенты",
      items: [
        { question: "Нужна ли консультация перед процедурой?", answer: "Краткая консультация включена перед первой процедурой для оценки типа кожи и целей." },
        { question: "Как подготовиться к визиту?", answer: "Приходите с чистой кожей, избегайте солнца за 24ч, сообщите о принимаемых лекарствах." },
        { question: "Какова политика отмены?", answer: "Требуется уведомление за 24 часа. Поздняя отмена может повлечь оплату." },
        { question: "Подходят ли продукты для чувствительной кожи?", answer: "Мы используем профессиональные дерматологически протестированные средства для всех типов кожи." },
      ],
    },
  },
};
