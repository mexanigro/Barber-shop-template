import type { NichePreset } from "../../types";
import { presetThemeAbogado } from "./themes";

export const abogadoPresetRu: NichePreset = {
  businessMode: "team",
  business: {
    type: "abogado",
    legalName: "MERIDIAN LAW GROUP S.L.P.",
    address:
      "8 Paseo de la Castellana, Torre Norte, Piso 14, Madrid, 28046, España",
    cancellationPolicy:
      "За 48 рабочих часов до назначенной консультации",
  },

  brand: {
    name: "MERIDIAN LAW",
    tagline: "Точность. Честность. Результат.",
    description:
      "Бутиковая юридическая фирма, специализирующаяся на корпоративном, трудовом и гражданском праве. Надёжные консультанты для компаний и частных лиц, требующих высших стандартов.",
    logoIconName: "Scale",
    aiPersona:
      "Вы — виртуальный помощник юридической фирмы Meridian Law. Ориентируйте посетителей по нашим направлениям практики, помогите им понять, какая консультация им нужна, и направьте на запись к подходящему юристу. Не предоставляйте обязывающих юридических рекомендаций.",
  },

  theme: presetThemeAbogado,

  hero: {
    titlePrefix: "НАДЁЖНЫЕ",
    titleHighlight: "ЮРИСТЫ",
    titleSuffix: "ДЛЯ СЛОЖНЫХ ВОПРОСОВ",
    subtitle:
      "Стратегические юридические консультации для бизнеса и частных лиц. Десятилетия совокупного опыта в корпоративном, трудовом и гражданском праве.",
    ctaPrimary: "ЗАПИСАТЬСЯ НА КОНСУЛЬТАЦИЮ",
    ctaSecondary: "НАПРАВЛЕНИЯ ПРАКТИКИ",
    backgroundImage:
      "https://images.unsplash.com/photo-1589994965851-a8f479c573a9?auto=format&fit=crop&q=80&w=2000",
  },

  contact: {
    address: {
      street: "8 Paseo de la Castellana, Torre Norte",
      district: "Piso 14, Distrito Financiero",
      cityStateZip: "Madrid, 28046",
    },
    phone: "+34 91 700 8800",
    email: "contact@meridianlaw.es",
    social: {
      instagram: "https://instagram.com/meridianlaw",
      twitter: "https://twitter.com/meridianlaw",
    },
  },

  hours: {
    monday: { start: "09:00", end: "19:00" },
    tuesday: { start: "09:00", end: "19:00" },
    wednesday: { start: "09:00", end: "19:00" },
    thursday: { start: "09:00", end: "19:00" },
    friday: { start: "09:00", end: "18:00" },
    saturday: null,
    sunday: null,
  },

  services: [
    {
      id: "consulta-inicial",
      name: "Первичная юридическая консультация",
      description:
        "Всесторонняя оценка вашего дела, обзор правовой стратегии и чёткие рекомендации по дальнейшим шагам.",
      duration: 60,
      price: 180,
    },
    {
      id: "contratos",
      name: "Подготовка и экспертиза договоров",
      description:
        "Разработка и анализ коммерческих договоров, соглашений о конфиденциальности и договоров на оказание услуг с полной правовой защитой.",
      duration: 90,
      price: 350,
    },
    {
      id: "constitucion",
      name: "Регистрация бизнеса",
      description:
        "Полное юридическое сопровождение создания компании: подготовка учредительных документов, регистрация и настройка комплаенса.",
      duration: 120,
      price: 600,
    },
    {
      id: "laboral",
      name: "Консультации по трудовому праву",
      description:
        "Консультации по вопросам найма, увольнений, коллективных договоров и трудовых споров для работодателей и работников.",
      duration: 60,
      price: 220,
    },
  ],

  staff: [
    {
      id: "elena",
      slug: "elena-casado",
      name: "Елена Касадо",
      photoUrl:
        "https://images.unsplash.com/photo-1573496799652-408c2ac9fe98?auto=format&fit=crop&q=80&w=800",
      specialty: "Корпоративное право и M&A",
      bio: "Партнёр и сооснователь Meridian Law. У Елены 15 лет опыта в корпоративных сделках, слияниях и коммерческих контрактах. Она консультирует как стартапы, так и компании из списка Fortune 500.",
      portfolio: [
        "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&q=80&w=1200",
        "https://images.unsplash.com/photo-1589994965851-a8f479c573a9?auto=format&fit=crop&q=80&w=1200",
        "https://images.unsplash.com/photo-1521791055366-0d553872952f?auto=format&fit=crop&q=80&w=1200",
        "https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&q=80&w=1200",
      ],
      social: {
        twitter: "https://twitter.com/elenacasado_law",
      },
      schedule: {
        monday: {
          isOpen: true,
          hours: { start: "09:00", end: "18:00" },
          breaks: [{ start: "14:00", end: "15:00", label: "Lunch" }],
        },
        tuesday: {
          isOpen: true,
          hours: { start: "09:00", end: "18:00" },
          breaks: [{ start: "14:00", end: "15:00", label: "Lunch" }],
        },
        wednesday: {
          isOpen: true,
          hours: { start: "09:00", end: "18:00" },
          breaks: [{ start: "14:00", end: "15:00", label: "Lunch" }],
        },
        thursday: {
          isOpen: true,
          hours: { start: "09:00", end: "18:00" },
          breaks: [{ start: "14:00", end: "15:00", label: "Lunch" }],
        },
        friday: {
          isOpen: true,
          hours: { start: "09:00", end: "17:00" },
          breaks: [{ start: "14:00", end: "15:00", label: "Lunch" }],
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
    {
      id: "marcos",
      slug: "marcos-gimenez",
      name: "Маркос Хименес",
      photoUrl:
        "https://images.unsplash.com/photo-1556157382-97eda2d62296?auto=format&fit=crop&q=80&w=800",
      specialty: "Трудовое право",
      bio: "Маркос специализируется на индивидуальных и коллективных трудовых отношениях, представляя как работодателей, так и работников в трудовых судах. Три года подряд отмечен рейтингом Chambers & Partners.",
      portfolio: [
        "https://images.unsplash.com/photo-1568992687947-868a62a9f521?auto=format&fit=crop&q=80&w=1200",
        "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?auto=format&fit=crop&q=80&w=1200",
        "https://images.unsplash.com/photo-1551836022-deb4988cc6c0?auto=format&fit=crop&q=80&w=1200",
        "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=1200",
      ],
      social: {
        twitter: "https://twitter.com/mgimenez_abog",
        instagram: "https://instagram.com/marcosgimenezlaw",
      },
      schedule: {
        monday: {
          isOpen: true,
          hours: { start: "10:00", end: "19:00" },
          breaks: [{ start: "14:00", end: "15:00", label: "Lunch" }],
        },
        tuesday: {
          isOpen: true,
          hours: { start: "10:00", end: "19:00" },
          breaks: [{ start: "14:00", end: "15:00", label: "Lunch" }],
        },
        wednesday: {
          isOpen: false,
          hours: { start: "00:00", end: "00:00" },
          breaks: [],
        },
        thursday: {
          isOpen: true,
          hours: { start: "10:00", end: "19:00" },
          breaks: [{ start: "14:00", end: "15:00", label: "Lunch" }],
        },
        friday: {
          isOpen: true,
          hours: { start: "10:00", end: "17:00" },
          breaks: [{ start: "14:00", end: "15:00", label: "Lunch" }],
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
    {
      id: "paula",
      slug: "paula-navarro",
      name: "Паула Наварро",
      photoUrl:
        "https://images.unsplash.com/photo-1580894732444-8ecded7900cd?auto=format&fit=crop&q=80&w=800",
      specialty: "Гражданское и имущественное право",
      bio: "Паула возглавляет гражданскую практику Meridian, консультируя по сделкам с недвижимостью, наследственным спорам и вопросам семейного права. Известна стратегическим спокойствием в стрессовых ситуациях.",
      portfolio: [
        "https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&q=80&w=1200",
        "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&q=80&w=1200",
        "https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&q=80&w=1200",
        "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&q=80&w=1200",
      ],
      social: {
        twitter: "https://twitter.com/paulanavarro_es",
      },
      schedule: {
        monday: {
          isOpen: true,
          hours: { start: "09:00", end: "17:00" },
          breaks: [{ start: "13:30", end: "14:30", label: "Lunch" }],
        },
        tuesday: {
          isOpen: true,
          hours: { start: "09:00", end: "17:00" },
          breaks: [{ start: "13:30", end: "14:30", label: "Lunch" }],
        },
        wednesday: {
          isOpen: true,
          hours: { start: "09:00", end: "17:00" },
          breaks: [{ start: "13:30", end: "14:30", label: "Lunch" }],
        },
        thursday: {
          isOpen: true,
          hours: { start: "09:00", end: "17:00" },
          breaks: [{ start: "13:30", end: "14:30", label: "Lunch" }],
        },
        friday: {
          isOpen: true,
          hours: { start: "09:00", end: "15:00" },
          breaks: [],
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
      name: "Карлос Диас",
      title: "Генеральный директор, Díaz Capital",
      text: "Елена провела нас через сложную сделку M&A с исключительной тщательностью и оперативностью. Её советы были решающими на каждом критическом этапе.",
      rating: 5,
    },
    {
      name: "Люсия Фернандес",
      title: "Директор по персоналу, Group Industries",
      text: "Маркос — именно тот юрист по трудовому праву, которого хочешь иметь: острый, спокойный и всегда на шаг впереди. Он уберёг компанию от крупного спора.",
      rating: 5,
    },
    {
      name: "Роберто Иглесиас",
      title: "Инвестор в недвижимость",
      text: "Работа Паулы по реструктуризации нашего портфеля была безупречной. Её внимание к деталям и понятные объяснения превратили сложный процесс в управляемый.",
      rating: 5,
    },
  ],

  gallery: [
    "https://images.unsplash.com/photo-1589994965851-a8f479c573a9?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1568992687947-868a62a9f521?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1521791055366-0d553872952f?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1551836022-deb4988cc6c0?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&q=80&w=1200",
  ],

  sections: {
    services: {
      title: "Направления практики",
      subtitle: "Наша экспертиза",
      images: [
        "https://images.unsplash.com/photo-1589994965851-a8f479c573a9?auto=format&fit=crop&q=80&w=600",
        "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&q=80&w=600",
        "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?auto=format&fit=crop&q=80&w=600",
        "https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&q=80&w=600",
      ],
    },
    team: {
      title: "Наши юристы",
      subtitle: "Знакомьтесь с командой",
      description:
        "Избранная группа старших юристов, приверженных предоставлению стратегических, персонализированных правовых консультаций. Каждый партнёр привносит глубокую отраслевую экспертизу и подтверждённый послужной список.",
    },
    whyChooseUs: {
      title: "Наше отличие",
      subtitle: "Почему Meridian",
      mainImage:
        "https://images.unsplash.com/photo-1521791055366-0d553872952f?auto=format&fit=crop&q=80&w=1000",
      badge: "20 лет\nбезупречности",
      benefits: [
        {
          iconName: "Scale",
          title: "Подтверждённые результаты",
          desc: "Более двух десятилетий успешных исходов в корпоративных, трудовых и гражданских делах для клиентов из различных отраслей.",
        },
        {
          iconName: "ShieldCheck",
          title: "Абсолютная конфиденциальность",
          desc: "Каждое дело ведётся с соблюдением строжайшей профессиональной тайны. Ваша информация никогда не покидает наш защищённый периметр.",
        },
        {
          iconName: "Clock",
          title: "Оперативный ответ",
          desc: "Мы понимаем, что юридические вопросы не терпят отлагательств. Наша команда отвечает в течение 24 часов в рабочие дни.",
        },
        {
          iconName: "Users",
          title: "Бутиковое внимание",
          desc: "Вы всегда общаетесь напрямую со старшим юристом. Никаких помощников, ведущих ваше дело без контроля.",
        },
      ],
    },
    testimonials: {
      title: "Отзывы клиентов",
      subtitle: "Нам доверяют лидеры",
    },
    gallery: {
      title: "Наш офис",
      subtitle: "Фирма",
    },
    location: {
      title: "Наше расположение",
      subtitle: "Посетите наш офис",
    },
    contact: {
      title: "Свяжитесь с нами",
      subtitle: "Запросить консультацию",
      description:
        "Расскажите нам о вашем юридическом вопросе. Один из наших юристов рассмотрит ваш запрос и ответит в течение 24 рабочих часов.",
    },
    booking: {
      title: "Записаться на консультацию",
      tagline: "Точные консультации, адаптированные под ваши потребности",
      steps: {
        service: "Направление",
        staff: "Юрист",
        datetime: "Расписание",
        details: "Подтверждение",
        payment: "Оплата",
      },
      aiConsultant: {
        title: "ИИ-юридический помощник",
        subtitle: "Не уверены, какое направление вам подходит?",
        description:
          "Кратко опишите вашу правовую ситуацию, и наш ИИ-помощник направит вас к подходящему юристу.",
        agentLabel: "Юридический ассистент",
        placeholder:
          "Опишите вашу ситуацию (например, «Спор с поставщиком из-за нарушения договора»)...",
      },
      success: {
        title: "Подтверждено",
        confirmed: "Консультация назначена!",
        requestSaved: "Запрос сохранён!",
        cancelled: "Отменено",
      },
    },
    admin: {
      staff: {
        title: "Справочник юристов",
        scheduleTitle: "Недельное расписание",
        commitButton: "Сохранить расписание",
        enforcementTitle: "Контроль расписания",
        enforcementDesc:
          "Доступность юристов контролируется системой бронирования в режиме реального времени. Изменения вступают в силу немедленно и предотвращают наложение консультаций.",
      },
    },
  },
};
