import type { NichePreset } from "../../types";
import { presetThemeBarberia } from "./themes";

export const barberiaPresetRu: NichePreset = {
  // To activate solo mode (single-person business), change to: businessMode: "solo",
  // Solo mode turns the Team section into an "About Me" layout and skips staff
  // selection in the booking wizard (auto-assigns staff[0]).
  businessMode: "team",
  business: {
    type: "barberia",
    legalName: "ONYX & STEEL GROOMING LLC",
    address:
      "123 Precision Way, Downtown Arts District, New York, NY 10012, United States",
    cancellationPolicy: "За 24 часа до назначенного времени визита",
  },

  brand: {
    name: "ONYX & STEEL",
    tagline: "Убежище современного джентльмена",
    description:
      "Премиальное пространство для мужского ухода, где вековые традиции мастерства сочетаются с современной точностью. Забронируйте свой эксклюзивный сеанс.",
    logoIconName: "Scissors",
    faviconEmoji: "✂️",
    logoDark: "/logo-onyx-steel.svg",
    ogImage: "/og-opengraph-barber.png",
    aiPersona:
      "Вы — виртуальный специалист по премиальному мужскому грумингу. Ваша миссия — элегантно консультировать клиентов, лаконично отвечать на их вопросы и рекомендовать услуги Onyx & Steel, которые лучше всего дополнят их индивидуальный стиль.",
  },

  theme: presetThemeBarberia,

  hero: {
    titlePrefix: "ТОЧНОСТЬ,",
    titleHighlight: "ВЫКОВАННАЯ",
    titleSuffix: "ДЛЯ СОВРЕМЕННОГО ДЖЕНТЛЬМЕНА",
    subtitle:
      "Здесь мастера своего дела формируют уверенность в каждой стрижке. Груминг, возведённый в ранг высокого искусства.",
    ctaPrimary: "ЗАБРОНИРОВАТЬ КРЕСЛО",
    ctaSecondary: "НАШИ УСЛУГИ",
    backgroundImage:
      "https://images.unsplash.com/photo-1532710093739-9470acff878f?auto=format&fit=crop&q=80&w=2000",
  },

  contact: {
    address: {
      street: "123 Precision Way",
      district: "Downtown Arts District",
      cityStateZip: "New York, NY 10012",
    },
    phone: "(555) 123-4567",
    email: "hello@onyxandsteel.com",
    social: {
      instagram: "https://instagram.com/onyxandsteel",
      facebook: "https://facebook.com/onyxandsteel",
      twitter: "https://twitter.com/onyxandsteel",
    },
  },

  hours: {
    monday: { start: "09:00", end: "20:00" },
    tuesday: { start: "09:00", end: "20:00" },
    wednesday: { start: "09:00", end: "20:00" },
    thursday: { start: "09:00", end: "20:00" },
    friday: { start: "09:00", end: "21:00" },
    saturday: { start: "10:00", end: "18:00" },
    sunday: null,
  },

  // ─── Services ────────────────────────────────────────────────────────────────
  // CRITICAL: services[i] maps 1:1 to sections.services.images[i].
  // If you add a service here, add its corresponding image below.
  services: [
    {
      id: "haircut",
      name: "Классическая стрижка",
      description:
        "Точная стрижка, выверенная по геометрии вашего лица. Японские ножницы, финиш опасной бритвой и премиальный стайлинговый продукт для завершения образа.",
      duration: 30,
      price: 45,
    },
    {
      id: "beard-sculpt",
      name: "Моделирование бороды",
      description:
        "Контурирование с точностью до миллиметра опасной бритвой, проработка формы и увлажняющий бальзам с аргановым маслом. Борода, которую вы всегда заслуживали.",
      duration: 25,
      price: 35,
    },
    {
      id: "straight-shave",
      name: "Бритьё опасной бритвой",
      description:
        "Классический ритуал бритья: подготовка горячим полотенцем, авторская пена с сандаловым деревом и опасная бритва из нержавеющей стали. Кожа гладкая, как полированная сталь.",
      duration: 35,
      price: 40,
    },
    {
      id: "color-treatment",
      name: "Окрашивание",
      description:
        "Камуфляж седины или полное окрашивание премиальными безаммиачными пигментами. Натуральный результат, стойкий цвет, безупречный вид на камеру.",
      duration: 50,
      price: 65,
    },
    {
      id: "full-ritual",
      name: "Полный ритуал",
      description:
        "Полный опыт Onyx & Steel: точная стрижка, моделирование бороды, процедура с горячим полотенцем и восстанавливающая сыворотка для волос.",
      duration: 75,
      price: 90,
    },
  ],

  staff: [
    {
      id: "alex",
      slug: "alex-reed",
      name: "Алекс «The Blade» Рид",
      // Avatar: professional barber in black apron inside barbershop
      photoUrl:
        "https://images.unsplash.com/photo-1717700921740-a1440f3b89a4?auto=format&fit=crop&q=80&w=800",
      specialty: "Классические фейды и тейперы",
      bio: "Более 12 лет за креслом — Алекс владеет полным спектром скин-фейдов и классических силуэтов. Его точность превращает каждую стрижку в персональную визитную карточку клиента.",
      // Portfolio: finished haircut RESULTS only — no process shots, no capes
      portfolio: [
        "https://images.unsplash.com/photo-1568339434343-2a640a1a9946?auto=format&fit=crop&q=80&w=1200",
        "https://images.unsplash.com/photo-1618049049816-43a00d5b0c3d?auto=format&fit=crop&q=80&w=1200",
        "https://images.unsplash.com/photo-1456327102063-fb5054efe647?auto=format&fit=crop&q=80&w=1200",
        "https://images.unsplash.com/photo-1578390432942-d323db577792?auto=format&fit=crop&q=80&w=1200",
      ],
      social: {
        instagram: "https://instagram.com/alexblade",
        twitter: "https://twitter.com/alexblade",
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
          hours: { start: "10:00", end: "16:00" },
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
      id: "daniel",
      slug: "daniel-petrocelli",
      name: "Даниэль Петрочелли",
      // Avatar: urban barber with apron and tattoo on arm
      photoUrl:
        "https://images.unsplash.com/photo-1723021073699-77f5442510a2?auto=format&fit=crop&q=80&w=800",
      specialty: "Искусство бороды и груминг",
      bio: "Даниэль — мастер работы с растительностью на лице. Его владение опасной бритвой и техника контурирования бороды сделали его главным авторитетом города в области премиального влажного бритья.",
      // Portfolio: finished beard RESULTS only — sculpted beards, clean lines
      portfolio: [
        "https://images.unsplash.com/photo-1657105052388-e839d5d0f395?auto=format&fit=crop&q=80&w=1200",
        "https://images.unsplash.com/photo-1659212165922-b1b64fc04ccf?auto=format&fit=crop&q=80&w=1200",
        "https://images.unsplash.com/photo-1674456483643-05448d24cd77?auto=format&fit=crop&q=80&w=1200",
        "https://images.unsplash.com/photo-1551810104-58185e8cfd0c?auto=format&fit=crop&q=80&w=1200",
      ],
      social: {
        instagram: "https://instagram.com/danielgrooming",
      },
      schedule: {
        monday: {
          isOpen: false,
          hours: { start: "00:00", end: "00:00" },
          breaks: [],
        },
        tuesday: {
          isOpen: true,
          hours: { start: "10:00", end: "19:00" },
          breaks: [{ start: "14:00", end: "15:00", label: "Break" }],
        },
        wednesday: {
          isOpen: true,
          hours: { start: "10:00", end: "19:00" },
          breaks: [{ start: "14:00", end: "15:00", label: "Break" }],
        },
        thursday: {
          isOpen: true,
          hours: { start: "10:00", end: "19:00" },
          breaks: [{ start: "14:00", end: "15:00", label: "Break" }],
        },
        friday: {
          isOpen: true,
          hours: { start: "10:00", end: "19:00" },
          breaks: [{ start: "14:00", end: "15:00", label: "Break" }],
        },
        saturday: {
          isOpen: true,
          hours: { start: "10:00", end: "19:00" },
          breaks: [{ start: "14:00", end: "15:00", label: "Break" }],
        },
        sunday: {
          isOpen: false,
          hours: { start: "00:00", end: "00:00" },
          breaks: [],
        },
      },
    },
    {
      id: "michael",
      slug: "michael-vane",
      name: "Майкл Вейн",
      // Avatar: barber in black long sleeve shirt, barbershop setting
      photoUrl:
        "https://images.unsplash.com/photo-1619233543112-fe382ff3693d?auto=format&fit=crop&q=80&w=800",
      specialty: "Ножницы и текстура",
      bio: "Майкл сочетает европейские техники работы ножницами с современным текстурированием. Результат — непринуждённые стили, излучающие безоговорочную уверенность.",
      // Portfolio: finished textured cut RESULTS only — no process shots
      portfolio: [
        "https://images.unsplash.com/photo-1587776535733-b4c80a99ef82?auto=format&fit=crop&q=80&w=1200",
        "https://images.unsplash.com/photo-1584864650621-95648f07518e?auto=format&fit=crop&q=80&w=1200",
        "https://images.unsplash.com/photo-1648742468740-6347e05c7faa?auto=format&fit=crop&q=80&w=1200",
        "https://images.unsplash.com/photo-1516646720587-727f6728837d?auto=format&fit=crop&q=80&w=1200",
      ],
      social: {
        instagram: "https://instagram.com/michaelvane",
        twitter: "https://twitter.com/michaelvane",
      },
      schedule: {
        monday: {
          isOpen: true,
          hours: { start: "09:00", end: "17:00" },
          breaks: [{ start: "12:00", end: "13:00", label: "Lunch" }],
        },
        tuesday: {
          isOpen: true,
          hours: { start: "09:00", end: "17:00" },
          breaks: [{ start: "12:00", end: "13:00", label: "Lunch" }],
        },
        wednesday: {
          isOpen: true,
          hours: { start: "09:00", end: "17:00" },
          breaks: [{ start: "12:00", end: "13:00", label: "Lunch" }],
        },
        thursday: {
          isOpen: true,
          hours: { start: "09:00", end: "17:00" },
          breaks: [{ start: "12:00", end: "13:00", label: "Lunch" }],
        },
        friday: {
          isOpen: true,
          hours: { start: "09:00", end: "17:00" },
          breaks: [{ start: "12:00", end: "13:00", label: "Lunch" }],
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
      name: "Маркус Торн",
      title: "Генеральный директор, TechSolutions",
      text: "Точность здесь — в своей собственной лиге. Алекс считал геометрию моего лица, прежде чем взял в руки хоть один инструмент. Я встал с кресла другим человеком.",
      rating: 5,
    },
    {
      name: "Джулиан Вейн",
      title: "Архитектор",
      text: "Техника работы Даниэля опасной бритвой — это форма медитации. Самое чистое и гладкое бритьё за последние двадцать лет. Больше никуда не пойду.",
      rating: 5,
    },
    {
      name: "Элиас Рид",
      title: "Фотограф",
      text: "Тёмный интерьер, сфокусированная энергия, результат мирового уровня. Именно так должен ощущаться барбершоп. Никакой театральности — только чистое мастерство.",
      rating: 5,
    },
  ],

  // ─── Gallery ─────────────────────────────────────────────────────────────────
  // 12 curated result-only shots: clean fades, textured styles, sculpted beards.
  // Rule: NO process shots, NO scissors/clippers in frame, NO capes on clients.
  gallery: [
    "https://images.unsplash.com/photo-1568339434343-2a640a1a9946?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1618049049816-43a00d5b0c3d?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1456327102063-fb5054efe647?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1578390432942-d323db577792?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1657105052388-e839d5d0f395?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1659212165922-b1b64fc04ccf?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1674456483643-05448d24cd77?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1551810104-58185e8cfd0c?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1587776535733-b4c80a99ef82?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1584864650621-95648f07518e?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1648742468740-6347e05c7faa?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1516646720587-727f6728837d?auto=format&fit=crop&q=80&w=1200",
  ],

  sections: {
    services: {
      title: "Искусство и мастерство",
      subtitle: "Премиальные услуги",
      // ACTION shots — one per service, same order as services[].
      images: [
        "https://images.unsplash.com/photo-1593702275687-f8b402bf1fb5?auto=format&fit=crop&q=80&w=600",
        "https://images.unsplash.com/photo-1621605815971-fbc98d665033?auto=format&fit=crop&q=80&w=600",
        "https://images.unsplash.com/photo-1761148438883-e34e0289a214?auto=format&fit=crop&q=80&w=600",
        "https://images.unsplash.com/photo-1634449571010-02389ed0f9b0?auto=format&fit=crop&q=80&w=600",
        "https://images.unsplash.com/photo-1654097800183-574ba7368f74?auto=format&fit=crop&q=80&w=600",
      ],
    },
    team: {
      title: "Мастера своего дела // v1.0",
      subtitle: "Ремесленники",
      description:
        "Отобраны за техническую точность, скульптурное видение и непоколебимую преданность эстетике современного мужского силуэта. Каждое кресло занимает мастер.",
    },
    whyChooseUs: {
      title: "Наш стандарт",
      subtitle: "Почему выбирают нас",
      mainImage:
        "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&q=80&w=1000",
      badge: "10 лет\nмастерства",
      benefits: [
        {
          iconName: "ShieldCheck",
          title: "Безупречная гигиена",
          desc: "Стерилизация всех инструментов медицинского уровня после каждого клиента. Ваша безопасность — наш безусловный стандарт.",
        },
        {
          iconName: "Clock",
          title: "Швейцарская пунктуальность",
          desc: "Мы уважаем ваше время. Начинаем вовремя — каждый раз. Без очередей, без оправданий.",
        },
        {
          iconName: "Award",
          title: "Мастерство высшего класса",
          desc: "Наша команда проходит строгое обучение и сертификацию для освоения каждой техники и типа волос.",
        },
        {
          iconName: "Zap",
          title: "Безупречный результат",
          desc: "Точность — не цель, а наш стандарт. Мы не останавливаемся, пока каждая линия не станет идеальной.",
        },
      ],
    },
    testimonials: {
      title: "Голоса доверия",
      subtitle: "Что говорят наши клиенты",
    },
    gallery: {
      title: "Визуальное мастерство",
      subtitle: "Портфолио",
    },
    location: {
      title: "Посетите нас",
      subtitle: "Найдите своё кресло",
    },
    contact: {
      title: "Свяжитесь с нами",
      subtitle: "Напишите нам",
      description:
        "Есть особый запрос или вопрос? Напишите нам, и наша команда оперативно ответит.",
    },
    booking: {
      title: "Запись на визит",
      tagline: "Опыт убежища современного джентльмена",
      steps: {
        service: "Услуга",
        staff: "Мастер",
        datetime: "Расписание",
        details: "Подтверждение",
        payment: "Оплата",
      },
      aiConsultant: {
        title: "Нейро-ассистент",
        subtitle: "Нужна точность стиля?",
        description:
          "Попросите нашего ИИ-специалиста порекомендовать вашу следующую миссию в груминге.",
        agentLabel: "Консультант",
        placeholder:
          "Опишите ваше видение (например, «Низкий фейд с плавным переходом в бороду и чёткий пробор»)...",
      },
      success: {
        title: "Готово",
        confirmed: "Подтверждено!",
        requestSaved: "Заявка сохранена!",
        cancelled: "Отменено",
      },
    },
    instagram: {
      title: "Следите за нашей работой",
      handle: "@barbermaster",
      url: "https://instagram.com/barbermaster",
      images: [
        "https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=400&h=400&fit=crop",
        "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=400&h=400&fit=crop",
        "https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=400&h=400&fit=crop",
        "https://images.unsplash.com/photo-1622286342621-4bd786c2447c?w=400&h=400&fit=crop",
        "https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=400&h=400&fit=crop",
        "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop",
      ],
    },
    admin: {
      staff: {
        title: "Справочник персонала",
        scheduleTitle: "Недельное расписание",
        commitButton: "Сохранить расписание",
        enforcementTitle: "Контроль расписания",
        enforcementDesc:
          "Расписание сотрудников контролируется системой бронирования в режиме реального времени. Изменения рабочих часов или заблокированных дней вступают в силу немедленно, предотвращая двойные записи.",
      },
    },
    faq: {
      title: "Часто задаваемые вопросы",
      subtitle: "Всё, что нужно знать перед визитом",
      items: [
        { question: "Нужна ли запись?", answer: "Принимаем без записи, но рекомендуем бронировать заранее для гарантии удобного времени." },
        { question: "Сколько длится стрижка?", answer: "Стандартная стрижка занимает 30-45 минут. Оформление бороды — ещё около 15 минут." },
        { question: "Какие способы оплаты принимаете?", answer: "Принимаем наличные, банковские карты и цифровые платежи." },
        { question: "Можно выбрать мастера?", answer: "Конечно! Выберите мастера при бронировании онлайн или сообщите при визите." },
      ],
    },
  },
};
