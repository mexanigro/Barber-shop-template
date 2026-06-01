import type { NichePreset } from "../../types";
import { presetThemeTattoo } from "./themes";

export const tattooPresetRu: NichePreset = {
  businessMode: "team",
  // ─── Business & Legal ────────────────────────────────────────────────────────
  business: {
    type: "tattoo",
    legalName: "MASTERPIECE INK STUDIO LLC",
    address:
      "87 Inkwell Avenue, Arts District, Los Angeles, CA 90012, United States",
    cancellationPolicy: "За 48 часов до назначенного времени сеанса",
  },

  // ─── Brand ───────────────────────────────────────────────────────────────────
  brand: {
    name: "MASTERPIECE INK",
    tagline: "Где кожа становится искусством",
    description:
      "Элитная тату-студия, где мастера превращают ваше видение в перманентный шедевр. Авторские эскизы, тонкие линии и глубокие консультации — каждая работа уникальна.",
    logoIconName: "Pen",
    faviconEmoji: "🖊️",
    aiPersona:
      "Вы — виртуальный специалист Masterpiece Ink, тату-студии премиум-класса. Ваша миссия — уверенно и профессионально консультировать клиентов: отвечать на вопросы об услугах, помогать подготовиться к сеансу, объяснять правила ухода и рекомендовать подходящего мастера для их замысла. Будьте тёплым, знающим и творческим.",
  },

  theme: presetThemeTattoo,

  // ─── Hero ─────────────────────────────────────────────────────────────────────
  hero: {
    titlePrefix: "ВАША КОЖА —",
    titleHighlight: "НАШ ХОЛСТ",
    titleSuffix: "ПЕРМАНЕНТНОЕ ИСКУССТВО ДЛЯ СМЕЛЫХ",
    subtitle:
      "Каждая работа начинается с бесплатной очной консультации — без обязательств, без депозита. Познакомьтесь с мастером, определите концепцию, а затем запишитесь на сеанс. Авторское искусство, выполненное с хирургической точностью.",
    ctaPrimary: "ЗАПИСАТЬСЯ НА КОНСУЛЬТАЦИЮ",
    ctaSecondary: "ПОРТФОЛИО",
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
      name: "Бесплатная консультация",
      description:
        "Начните здесь — бесплатно и без обязательств. Личная встреча с мастером на 30–60 минут: обзор портфолио, обсуждение концепции, выбор расположения и стиля, планирование проекта — до внесения какого-либо депозита.",
      duration: 60,
      price: 0,
    },
    {
      id: "custom-design",
      name: "Авторский дизайн",
      description:
        "Полностью оригинальная работа, созданная по вашему замыслу. Стоимость $180/час — большинство авторских работ занимают 1–4 сеанса в зависимости от размера и сложности. Каждая работа начинается с бесплатной консультации и включает утверждение эскиза перед сеансом.",
      duration: 180,
      price: 180,
    },
    {
      id: "fine-line",
      name: "Тонкие линии и минимализм",
      description:
        "Однаигольная точность для ультратонких линий, микрореализма и минималистичных композиций. Стоимость $150/час. Небольшие минималистичные дизайны менее 5 см могут быть оценены фиксированно — уточняйте на бесплатной консультации.",
      duration: 120,
      price: 150,
    },
    {
      id: "black-grey-realism",
      name: "Чёрно-серый реализм",
      description:
        "Гиперреалистичные портреты и кинематографичные образы в чёрно-сером стиле. Стоимость $200/час — крупные реалистичные работы распределяются на несколько сеансов для оптимальной насыщенности пигмента и заживления. Требуется бесплатная консультация.",
      duration: 240,
      price: 200,
    },
    {
      id: "cover-up",
      name: "Перекрытие и доработка",
      description:
        "Превратите нежелательную татуировку в авторское произведение. Требуется обязательная бесплатная консультация для оценки возможностей перекрытия. Стоимость $160/час — большинство перекрытий занимают 2–3 сеанса. Дизайнерский депозит $100 вносится после консультации и зачитывается в итоговый счёт.",
      duration: 180,
      price: 160,
    },
    {
      id: "flash-small",
      name: "Флеш и мини-работы",
      description:
        "Готовые эскизы и небольшие авторские работы до 8 см. Фиксированный минимум студии от $120 — платите ровно столько, сколько видите, без почасовой тарификации. Идеально для первого тату или дополнения коллекции без предварительной консультации.",
      duration: 60,
      price: 120,
    },
    {
      id: "piercing",
      name: "Профессиональный пирсинг",
      description:
        "Профессиональный пирсинг с использованием имплантационного титана и хирургической стали. От классических мочек до верхнего хряща и микродермалов — фиксированная цена, обслуживание в день обращения, полный набор для ухода включён.",
      duration: 30,
      price: 80,
    },
  ],

  // ─── Staff ───────────────────────────────────────────────────────────────────
  staff: [
    {
      id: "izzy",
      slug: "izzy-cross",
      name: "Иззи Кросс",
      // Portrait: edgy female tattoo artist, studio environment, professional
      photoUrl:
        "https://images.unsplash.com/photo-1677286061466-7cc3531e5027?auto=format&fit=crop&q=80&w=800",
      specialty: "Тонкие линии и ботаническая иллюстрация",
      bio: "Иззи пять лет работала ботаническим иллюстратором, прежде чем открыла для себя тату-искусство. Её деликатная однаигольная линия привносит на кожу органичную, почти акварельную чувственность. Специализируется на флоре, фауне и абстрактном минимализме — её работы выглядят так, будто всегда были частью тела.",
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
        tuesday: { isOpen: true, hours: { start: "11:00", end: "19:00" }, breaks: [{ start: "14:00", end: "15:00", label: "Обед" }] },
        wednesday: { isOpen: true, hours: { start: "11:00", end: "19:00" }, breaks: [{ start: "14:00", end: "15:00", label: "Обед" }] },
        thursday: { isOpen: true, hours: { start: "11:00", end: "19:00" }, breaks: [{ start: "14:00", end: "15:00", label: "Обед" }] },
        friday: { isOpen: true, hours: { start: "11:00", end: "20:00" }, breaks: [{ start: "15:00", end: "16:00", label: "Перерыв" }] },
        saturday: { isOpen: true, hours: { start: "10:00", end: "18:00" }, breaks: [] },
        sunday: { isOpen: false, hours: { start: "00:00", end: "00:00" }, breaks: [] },
      },
    },
    {
      id: "marco",
      slug: "marco-veil",
      name: "Марко Вейл",
      // Portrait: male tattoo artist, tattooed arms, professional studio setting
      photoUrl:
        "https://images.unsplash.com/photo-1746703509843-af889aa20300?auto=format&fit=crop&q=80&w=800",
      specialty: "Чёрно-серый реализм",
      bio: "Марко по праву считается одним из ведущих мастеров чёрно-серого реализма на Западном побережье. С более чем 14-летним опытом его гипердетализированные портреты и кинематографичные композиции публиковались в международных тату-изданиях. Каждая работа Марко — исследование света, тени и вечности.",
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
        wednesday: { isOpen: true, hours: { start: "12:00", end: "20:00" }, breaks: [{ start: "16:00", end: "17:00", label: "Перерыв" }] },
        thursday: { isOpen: true, hours: { start: "12:00", end: "20:00" }, breaks: [{ start: "16:00", end: "17:00", label: "Перерыв" }] },
        friday: { isOpen: true, hours: { start: "11:00", end: "21:00" }, breaks: [{ start: "15:00", end: "16:00", label: "Обед" }] },
        saturday: { isOpen: true, hours: { start: "10:00", end: "21:00" }, breaks: [{ start: "14:00", end: "15:00", label: "Обед" }] },
        sunday: { isOpen: true, hours: { start: "12:00", end: "18:00" }, breaks: [] },
      },
    },
    {
      id: "devon",
      slug: "devon-ash",
      name: "Девон Эш",
      // Portrait: non-binary/androgynous artist, creative professional look
      photoUrl:
        "https://images.unsplash.com/photo-1659693707379-f7b696d92011?auto=format&fit=crop&q=80&w=800",
      specialty: "Авторский дизайн и перекрытия",
      bio: "Девон — главный мастер нестандартных решений студии. Обладая бэкграундом в графическом дизайне и бесстрашным подходом к смелым композициям, Девон специализируется на сложных авторских работах и трансформирующих перекрытиях. Если у вас есть история, которую хотите нанести на кожу — или ошибка, которую нужно исправить — Девон ваш мастер.",
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
        tuesday: { isOpen: true, hours: { start: "11:00", end: "20:00" }, breaks: [{ start: "15:00", end: "16:00", label: "Перерыв" }] },
        wednesday: { isOpen: true, hours: { start: "11:00", end: "20:00" }, breaks: [{ start: "15:00", end: "16:00", label: "Перерыв" }] },
        thursday: { isOpen: true, hours: { start: "11:00", end: "20:00" }, breaks: [{ start: "15:00", end: "16:00", label: "Перерыв" }] },
        friday: { isOpen: true, hours: { start: "11:00", end: "20:00" }, breaks: [{ start: "15:00", end: "16:00", label: "Перерыв" }] },
        saturday: { isOpen: true, hours: { start: "10:00", end: "19:00" }, breaks: [] },
        sunday: { isOpen: false, hours: { start: "00:00", end: "00:00" }, breaks: [] },
      },
    },
  ],

  // ─── Testimonials ─────────────────────────────────────────────────────────────
  testimonials: [
    {
      name: "Серена Блэквуд",
      title: "Арт-директор",
      text: "Иззи взяла черновой набросок, который я вынашивала три года, и превратила его в самую потрясающую тонколинейную работу, которую я когда-либо видела. Одна только консультация стоила поездки.",
      rating: 5,
    },
    {
      name: "Дэмиен Круз",
      title: "Кинематографист",
      text: "Чёрно-серый реализм Марко — это действительно другой уровень. Мой рукав выглядит как фотография — люди регулярно останавливают меня на улице. Стоит каждого цента премиума.",
      rating: 5,
    },
    {
      name: "Прия Нолан",
      title: "Архитектор",
      text: "Я ужасно боялась делать перекрытие. Девон оценил мою старую татуировку, разработал полностью авторский дизайн, и результат невозможно узнать — от прежней работы не осталось и следа. Настоящая трансформация.",
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
      title: "Ремесло и дисциплина",
      subtitle: "Наши услуги",
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
      title: "Чернила и идентичность // v1.0",
      subtitle: "Мастера",
      description:
        "Каждый мастер Masterpiece Ink отобран не только за техническое совершенство, но и за уникальный творческий голос. Мы не нанимаем ремесленников — мы собираем визионеров. Ваша кожа заслуживает не меньшего.",
    },
    whyChooseUs: {
      title: "Наш стандарт",
      subtitle: "Почему выбирают нас",
      // Premium tattoo studio interior — clean, professional, dramatic lighting
      mainImage:
        "https://images.unsplash.com/photo-1760877611905-0f885a3ce551?auto=format&fit=crop&q=80&w=1000",
      badge: "10 лет\nискусства",
      benefits: [
        {
          iconName: "ShieldCheck",
          title: "Гигиена медицинского уровня",
          desc: "Одноразовые иглы, автоклавная стерилизация оборудования и дезинфекция поверхностей госпитального класса после каждого клиента. Ваша безопасность — наш абсолютный приоритет.",
        },
        {
          iconName: "Clock",
          title: "Сначала — консультация",
          desc: "Каждая работа начинается с полноценной консультации. Мы вкладываем время в понимание вашего видения, прежде чем проведём хотя бы одну линию — потому что перманент требует совершенства.",
        },
        {
          iconName: "Award",
          title: "Мастера с наградами",
          desc: "Наша команда — обладатели наград международных тату-конвенций и публикаций в ведущих отраслевых изданиях. Вы сидите в кресле мастера мирового уровня.",
        },
        {
          iconName: "Zap",
          title: "Только авторские работы",
          desc: "Никаких стен с флешами. Никаких шаблонных дизайнов. Каждая татуировка — оригинальное произведение, созданное исключительно для вас и никогда не воспроизводимое.",
        },
      ],
    },
    testimonials: {
      title: "Голоса доверия",
      subtitle: "Что говорят наши клиенты",
    },
    gallery: {
      title: "Перманентные шедевры",
      subtitle: "Портфолио",
    },
    location: {
      title: "Посетите студию",
      subtitle: "Как нас найти",
    },
    contact: {
      title: "Свяжитесь с нами",
      subtitle: "Начните свой путь",
      description:
        "Готовы воплотить своё видение? Напишите нам, приложите референсы, и один из наших мастеров свяжется с вами для назначения консультации.",
    },
    booking: {
      title: "Записаться на визит",
      tagline: "Начните с бесплатной консультации — затем запишитесь на сеанс, когда будете готовы.",
      steps: {
        service: "Услуга",
        staff: "Мастер",
        datetime: "Расписание",
        details: "Подтверждение",
        payment: "Оплата",
      },
      aiConsultant: {
        title: "Чернильный интеллект",
        subtitle: "Не знаете, с чего начать?",
        description:
          "Опишите свою идею, и наш ИИ-специалист порекомендует подходящую услугу, стиль и мастера — чтобы вы пришли на консультацию полностью подготовленным.",
        agentLabel: "Творческий консультант",
        placeholder:
          "Опишите вашу идею (например, «Тонколинейный ботанический рисунок на запястье, минималистичный и деликатный»)...",
      },
      success: {
        title: "Готово",
        confirmed: "Подтверждено!",
        requestSaved: "Заявка сохранена!",
        cancelled: "Отменено",
      },
    },
    instagram: {
      title: "Свежие работы",
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
        title: "Реестр мастеров",
        scheduleTitle: "Недельное расписание студии",
        commitButton: "Сохранить расписание",
        enforcementTitle: "Контроль расписания",
        enforcementDesc:
          "Расписание мастеров контролируется системой бронирования в режиме реального времени. Изменения рабочих часов или заблокированных дней вступают в силу немедленно, предотвращая двойные записи.",
      },
    },
    faq: {
      title: "Часто задаваемые вопросы",
      subtitle: "Перед тем как сделать тату",
      items: [
        { question: "Как подготовиться к сеансу?", answer: "Хорошо выспитесь, поешьте, пейте воду и избегайте алкоголя за 24 часа." },
        { question: "Сколько стоит татуировка?", answer: "Цена зависит от размера, детализации и расположения. Запишитесь на консультацию для точной оценки." },
        { question: "Сколько заживает?", answer: "Поверхностное заживление — 2-3 недели. Полное восстановление кожи — 4-6 недель при правильном уходе." },
        { question: "Делаете перекрытия?", answer: "Да! Наши мастера специализируются на креативных решениях для перекрытий. Приходите на консультацию." },
      ],
    },
  },
};
