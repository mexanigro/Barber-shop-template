import type { NichePreset } from "../../types";
import { presetThemeEmployment } from "./themes";

export const employmentPresetRu: NichePreset = {
  businessMode: "solo",
  business: {
    type: "employment",
    legalName: "Лект Григори — Агентство занятости",
    address: "ул. Биалик 44, Ашкелон, Израиль",
    cancellationPolicy: "",
  },

  brand: {
    name: "Лект Григори",
    tagline: "Соединяем людей с работой",
    description:
      "Лект Григори специализируется на трудоустройстве в склады, супермаркеты, уборку, логистику, водителями, поваром, строительство и другие сферы. Мы здесь для вас.",
    logoIconName: "Briefcase",
    faviconEmoji: "💼",
    ogImage: "/og-employment.png",
    aiPersona:
      "Вы представитель Лект Григори, израильского агентства занятости. Ваша задача — помочь соискателям понять процесс трудоустройства и направить их на регистрацию. Отвечайте тепло и профессионально на русском языке.",
  },

  theme: presetThemeEmployment,

  hero: {
    titlePrefix: "Ищете",
    titleHighlight: "работу?",
    titleSuffix: "Мы найдём для вас",
    subtitle:
      "Лект Григори связывает соискателей с вакансиями по всему Израилю. Зарегистрируйтесь и мы свяжемся с вами в течение 24 часов.",
    ctaPrimary: "Регистрация",
    ctaSecondary: "Доступные вакансии",
    backgroundImage:
      "https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=1920&q=80",
    stats: [
      { value: "500+", label: "Трудоустроено" },
      { value: "120+", label: "Партнёров-работодателей" },
      { value: "15+", label: "Городов Израиля" },
    ],
  },

  contact: {
    address: {
      street: "ул. Биалик 44",
      district: "Ашкелон",
      cityStateZip: "Ашкелон, Израиль",
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
      name: "Давид К.",
      title: "Работник склада",
      text: "Через два дня после регистрации я уже вышел на работу. Очень рекомендую!",
      rating: 5,
    },
    {
      name: "Алина М.",
      title: "Сотрудник супермаркета",
      text: "Команда была очень доброжелательной и профессиональной. Нашли мне работу рядом с домом.",
      rating: 5,
    },
    {
      name: "Ахмад Р.",
      title: "Курьер-водитель",
      text: "Отличный сервис, всё было быстро и просто. Большое спасибо!",
      rating: 5,
    },
  ],

  gallery: [],

  sections: {
    services: {
      title: "Направления трудоустройства",
      subtitle: "Доступные вакансии",
      images: [],
    },
    team: {
      title: "Наша команда",
      subtitle: "Специалисты по трудоустройству",
      description:
        "Команда Лект Григори — это опытные специалисты по трудоустройству, которые отлично знают израильский рынок труда. Мы здесь, чтобы помочь вам найти подходящую работу.",
    },
    whyChooseUs: {
      title: "Почему Лект Григори?",
      subtitle: "Наши преимущества",
      mainImage:
        "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&q=80",
      badge: "10+ лет\nопыта",
      benefits: [
        {
          iconName: "Zap",
          title: "Быстрое трудоустройство",
          desc: "Мы связываемся с вами в течение 24 часов после регистрации и быстро подбираем работу.",
        },
        {
          iconName: "Shield",
          title: "Проверенные работодатели",
          desc: "Все наши партнёры проходят тщательную проверку, чтобы гарантировать справедливые условия труда.",
        },
        {
          iconName: "Globe",
          title: "Многоязычная поддержка",
          desc: "Мы говорим на иврите, русском, английском и арабском — никто не останется без помощи.",
        },
        {
          iconName: "MapPin",
          title: "По всему Израилю",
          desc: "От Ашкелона до Хайфы — сотни открытых вакансий по всей стране.",
        },
      ],
    },
    testimonials: {
      title: "Отзывы соискателей",
      subtitle: "Истории успеха",
    },
    gallery: {
      title: "",
      subtitle: "",
    },
    location: {
      title: "Как нас найти",
      subtitle: "Наш офис",
    },
    contact: {
      title: "Связаться с нами",
      subtitle: "Мы здесь для вас",
      description:
        "Есть вопросы? Хотите узнать больше? Напишите нам и мы ответим в кратчайшие сроки.",
    },
    booking: {
      title: "Регистрация",
      tagline: "Процесс регистрации в Лект Григори",
      steps: {
        service: "Направление",
        staff: "Менеджер",
        datetime: "Время",
        details: "Данные",
        payment: "Подтверждение",
      },
      aiConsultant: {
        title: "Умный помощник",
        subtitle: "Есть вопросы?",
        description:
          "Спросите нашего умного помощника о доступных вакансиях и процессе регистрации.",
        agentLabel: "Цифровой агент",
        placeholder: "Напр.: «Ищу работу на складе в Ашкелоне»...",
      },
      success: {
        title: "Успешно",
        confirmed: "Подтверждено!",
        requestSaved: "Заявка сохранена!",
        cancelled: "Отменено",
      },
    },
    admin: {
      staff: {
        title: "Персонал",
        scheduleTitle: "Расписание",
        commitButton: "Сохранить",
        enforcementTitle: "Соблюдение расписания",
        enforcementDesc: "",
      },
    },
    faq: {
      title: "Часто задаваемые вопросы",
      subtitle: "Всё, что вам нужно знать",
      items: [
        {
          question: "Как работает процесс регистрации?",
          answer:
            "Всё просто! Заполните короткую анкету, и мы свяжемся с вами в течение 24 часов, чтобы понять, что вам подходит.",
        },
        {
          question: "Услуга платная?",
          answer:
            "Нет! Для соискателей наш сервис абсолютно бесплатный. Нам платят работодатели.",
        },
        {
          question: "Какие виды работ доступны?",
          answer:
            "Склады, супермаркеты, уборка, логистика, водители, кулинария/гастрономия, строительство и другое.",
        },
        {
          question: "Как быстро можно начать работать?",
          answer:
            "Многим нашим партнёрам нужны работники срочно. После регистрации нередко удаётся выйти на работу в течение нескольких дней.",
        },
        {
          question: "Нужен ли опыт работы?",
          answer:
            "Не обязательно. Многие позиции не требуют предыдущего опыта. Мы подберём вам работу по навыкам и пожеланиям.",
        },
        {
          question: "Какие районы вы охватываете?",
          answer:
            "Мы работаем по всему Израилю, с акцентом на южные и центральные регионы.",
        },
      ],
    },
    howItWorks: {
      title: "Как это работает",
      subtitle: "Три простых шага",
      steps: [
        {
          number: "01",
          title: "Регистрируетесь",
          description: "Заполните короткую анкету с вашими данными и предпочтениями",
          iconName: "UserPlus",
        },
        {
          number: "02",
          title: "Мы свяжемся с вами",
          description:
            "Наш менеджер изучит вашу анкету и свяжется по WhatsApp или телефону",
          iconName: "MessageCircle",
        },
        {
          number: "03",
          title: "Выходите на работу",
          description: "Получаете подходящее предложение и начинаете зарабатывать",
          iconName: "Rocket",
        },
      ],
    },
    jobCategories: {
      title: "Направления работы",
      subtitle: "Выберите интересующую вас сферу",
      categories: [
        {
          id: "supermarket",
          label: "Супермаркеты",
          iconName: "ShoppingCart",
          description: "Кассиры, выкладчики товара, персонал торгового зала",
        },
        {
          id: "warehouse",
          label: "Склады",
          iconName: "Package",
          description: "Сортировка, упаковка, управление запасами",
        },
        {
          id: "cleaning",
          label: "Уборка",
          iconName: "Sparkles",
          description: "Офисы, здания, промышленные объекты",
        },
        {
          id: "logistics",
          label: "Логистика",
          iconName: "Truck",
          description: "Погрузка, доставка, дистрибуция",
        },
        {
          id: "drivers",
          label: "Водители",
          iconName: "Car",
          description: "Доставка, перевозки, курьерская служба",
        },
        {
          id: "cooking",
          label: "Кулинария и гастрономия",
          iconName: "ChefHat",
          description: "Персонал кухни, заготовщики, кейтеринг",
        },
        {
          id: "construction",
          label: "Строительство",
          iconName: "HardHat",
          description: "Строительство, ремонт, инфраструктура",
        },
        {
          id: "other",
          label: "Другие варианты",
          iconName: "Plus",
          description: "Охрана, сельское хозяйство, гостиничный бизнес и другое",
        },
      ],
    },
    employmentForm: {
      title: "Регистрация на работу",
      subtitle: "Заполните анкету, и мы свяжемся с вами в течение 24 часов",
      steps: {
        name: {
          title: "Как вас зовут?",
          firstNameLabel: "Имя",
          lastNameLabel: "Фамилия",
        },
        city: {
          title: "Где вы живёте?",
          label: "Город",
          placeholder: "Выберите город",
        },
        interest: {
          title: "Какая работа вас интересует?",
        },
        experience: {
          title: "Расскажите о себе",
          experienceLabel: "Есть предыдущий опыт работы",
          availabilityLabel: "Доступность",
          driversLicenseLabel: "Есть водительские права",
          languagesLabel: "Языки, которыми я владею",
          languages: [
            { id: "he", label: "Иврит" },
            { id: "ru", label: "Русский" },
            { id: "en", label: "Английский" },
            { id: "ar", label: "Арабский" },
            { id: "am", label: "Амхарский" },
            { id: "fr", label: "Французский" },
          ],
          availabilityOptions: [
            { id: "fulltime", label: "Полная занятость" },
            { id: "parttime", label: "Частичная занятость" },
            { id: "flexible", label: "Гибкий график" },
          ],
        },
        contact: {
          title: "Как с вами связаться?",
          phoneLabel: "Номер телефона",
          emailLabel: "Электронная почта (необязательно)",
        },
        summary: {
          title: "Проверка и отправка",
          submitLabel: "Отправить заявку",
          successTitle: "Заявка отправлена!",
          successMessage:
            "Мы получили ваши данные. Наш менеджер свяжется с вами в течение 24 часов.",
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
  },
};
