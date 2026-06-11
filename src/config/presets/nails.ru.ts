import type { NichePreset } from "../../types";
import { presetThemeNails } from "./themes";

export const nailsPresetRu: NichePreset = {
  businessMode: "team",
  // ─── Business & Legal ────────────────────────────────────────────────────────
  business: {
    type: "nails",
    legalName: "AURA NAIL STUDIO LLC",
    address: "214 Bloom Street, Design District, Miami, FL 33132, United States",
    cancellationPolicy: "За 24 часа до назначенного времени визита",
  },

  // ─── Brand ───────────────────────────────────────────────────────────────────
  brand: {
    name: "AURA NAIL STUDIO",
    tagline: "Где каждая деталь сияет",
    description:
      "Премиальная студия ногтевого сервиса — точное мастерство, стойкие гель-системы и индивидуальный дизайн ногтей. Каждый визит — приватный, неспешный опыт, созданный вокруг вашей эстетики.",
    logoIconName: "Sparkles",
    faviconEmoji: "💅",
    ogImage: "https://images.unsplash.com/photo-1690749138086-7422f71dc159?auto=format&fit=crop&q=80&w=1200",
    aiPersona:
      "Вы — виртуальный специалист Aura Nail Studio, премиальной студии маникюра в Design District, Майами. Ваша миссия — помогать клиентам с теплотой и профессионализмом: отвечать на вопросы об услугах, помогать подготовиться к визиту, объяснять уход после процедуры и подбирать подходящего мастера и процедуру. Будьте приветливы, компетентны и сфокусированы на красоте.",
  },

  theme: presetThemeNails,

  // ─── Hero ─────────────────────────────────────────────────────────────────────
  hero: {
    titlePrefix: "ВАШИ НОГТИ,",
    titleHighlight: "НАШЕ ИСКУССТВО",
    titleSuffix: "БЕЗУПРЕЧНАЯ КРАСОТА КАЖДЫЙ РАЗ",
    subtitle:
      "Каждый визит начинается с персонального брифинга — форма, покрытие и стиль до начала процедуры. Авторское ногтевое искусство с мастерской точностью.",
    ctaPrimary: "ЗАПИСАТЬСЯ",
    ctaSecondary: "ГАЛЕРЕЯ",
    // Luxury nail salon interior — soft lighting, elegant station, premium aesthetic
    backgroundImage:
      "https://images.unsplash.com/photo-1690749138086-7422f71dc159?auto=format&fit=crop&q=80&w=2000",
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
      name: "Классический маникюр",
      description:
        "Основа красивых ногтей. Мастер придаёт ногтям желаемую форму, бережно обрабатывает кутикулу, выполняет расслабляющий массаж кистей и запястий и наносит выбранный лак с безупречным покрытием без разводов. Полный 45-минутный ритуал.",
      duration: 45,
      price: 45,
    },
    {
      id: "gel-manicure",
      name: "Гель-маникюр",
      description:
        "Стойкий цвет, полимеризованный под UV-лампой, с зеркальным блеском и защитой от сколов и выцветания до трёх недель. Включает коррекцию формы, уход за кутикулой, питательный уход за руками и выбор из нашей коллекции гель-лаков. Идеально для насыщенного графика и путешествий.",
      duration: 60,
      price: 65,
    },
    {
      id: "acrylic-full-set",
      name: "Полный набор акрила",
      description:
        "Скульптурные акриловые наращивания по вашим точным параметрам — длина, форма и покрытие подбираются индивидуально. Гроб, миндаль, квадрат или стилет — мастер вручную формирует каждый ноготь для структурной прочности и органичного сочетания с натуральной пластиной.",
      duration: 90,
      price: 85,
    },
    {
      id: "nail-art",
      name: "Нейл-арт и авторский дизайн",
      description:
        "Превратите ногти в носимое искусство. Ручная роспись, микродетализация, инкрустация стразами, хромовые пудры и объёмные 3D-элементы — всё по индивидуальному брифу. Стоимость рассчитывается за ноготь в зависимости от сложности. Принесите свои референсы или доверьте дизайн нам.",
      duration: 60,
      price: 25,
    },
    {
      id: "spa-pedicure",
      name: "Люкс спа-педикюр",
      description:
        "Полный ритуал для ног: тёплая ванночка с ароматическими минеральными солями, полное скрабирование, увлажняющая маска, расширенный массаж голеней и стоп, профессиональное оформление ногтей и гель-покрытие на выбор. 75 минут непрерывного наслаждения.",
      duration: 75,
      price: 75,
    },
    {
      id: "extensions-infills",
      name: "Наращивание и коррекция",
      description:
        "Поддержание существующего акрилового или гель-набора с точной коррекцией — восстановление длины, устранение отросших зон и обновление покрытия. Включает оформление формы, уход за кутикулой и обновление цвета. Также доступно как полное наращивание поверх натурального ногтя.",
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
        "https://images.unsplash.com/photo-1687293233752-ec42de2050db?auto=format&fit=crop&q=80&w=800",
      specialty: "Гель и нейл-арт",
      bio: "София начинала как художник, прежде чем обнаружила свой истинный холст — ногти. Восемь лет опыта и образование в области иллюстрации наделили её исключительным вниманием к деталям. Известна сложными рисунками от руки, изящными ботаническими мотивами и миниатюрными портретами — её работы регулярно появляются в лайфстайл-изданиях Майами. К каждому брифу клиента она подходит как к настоящему творческому сотрудничеству.",
      // Portfolio: finished nail art and gel manicure results only
      portfolio: [
        "https://images.unsplash.com/photo-1604654894610-df63bc536371?auto=format&fit=crop&q=80&w=1200",
        "https://images.unsplash.com/photo-1632345031435-8727f6897d53?auto=format&fit=crop&q=80&w=1200",
        "https://images.unsplash.com/photo-1607779097040-26e80aa78e66?auto=format&fit=crop&q=80&w=1200",
        "https://images.unsplash.com/photo-1519014816548-bf5fe059798b?auto=format&fit=crop&q=80&w=1200",
      ],
      social: {
        instagram: "https://instagram.com/sofiareyes.nails",
      },
      schedule: {
        monday: { isOpen: false, hours: { start: "00:00", end: "00:00" }, breaks: [] },
        tuesday: { isOpen: true, hours: { start: "10:00", end: "18:00" }, breaks: [{ start: "13:00", end: "14:00", label: "Обед" }] },
        wednesday: { isOpen: true, hours: { start: "10:00", end: "18:00" }, breaks: [{ start: "13:00", end: "14:00", label: "Обед" }] },
        thursday: { isOpen: true, hours: { start: "10:00", end: "19:00" }, breaks: [{ start: "13:00", end: "14:00", label: "Обед" }] },
        friday: { isOpen: true, hours: { start: "10:00", end: "19:00" }, breaks: [{ start: "14:00", end: "15:00", label: "Перерыв" }] },
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
        "https://images.unsplash.com/photo-1570697756485-aa4f6b0e1fac?auto=format&fit=crop&q=80&w=800",
      specialty: "Акрил и скульптурирование",
      bio: "Камиль прошла обучение в ведущей ногтевой академии Парижа, прежде чем переехать в Майами, привнеся характерную европейскую точность в скульптурную работу. Специализируется на архитектурных формах ногтей — длинный гроб, утончённый миндаль, драматичный стилет — с безупречно гладким акриловым покрытием, которое держит форму неделями. Работы Камиль столь же технически совершенны, сколь и визуально эффектны.",
      // Portfolio: finished acrylic sets and sculpted nail results only
      portfolio: [
        "https://images.unsplash.com/photo-1633955726992-2b7c0d2d2a69?auto=format&fit=crop&q=80&w=1200",
        "https://images.unsplash.com/photo-1610992015732-2449b76344bc?auto=format&fit=crop&q=80&w=1200",
        "https://images.unsplash.com/photo-1672405313394-93dff75eae32?auto=format&fit=crop&q=80&w=1200",
        "https://images.unsplash.com/photo-1643648855003-f536c436f399?auto=format&fit=crop&q=80&w=1200",
      ],
      social: {
        instagram: "https://instagram.com/camilledupont.nails",
        facebook: "https://facebook.com/camilledupont",
      },
      schedule: {
        monday: { isOpen: false, hours: { start: "00:00", end: "00:00" }, breaks: [] },
        tuesday: { isOpen: false, hours: { start: "00:00", end: "00:00" }, breaks: [] },
        wednesday: { isOpen: true, hours: { start: "10:00", end: "19:00" }, breaks: [{ start: "13:00", end: "14:00", label: "Обед" }] },
        thursday: { isOpen: true, hours: { start: "10:00", end: "19:00" }, breaks: [{ start: "13:00", end: "14:00", label: "Обед" }] },
        friday: { isOpen: true, hours: { start: "10:00", end: "19:00" }, breaks: [{ start: "14:00", end: "15:00", label: "Перерыв" }] },
        saturday: { isOpen: true, hours: { start: "10:00", end: "19:00" }, breaks: [{ start: "13:30", end: "14:30", label: "Обед" }] },
        sunday: { isOpen: true, hours: { start: "11:00", end: "17:00" }, breaks: [] },
      },
    },
    {
      id: "yuki",
      slug: "yuki-tanaka",
      name: "Yuki Tanaka",
      // Portrait: professional female beauty technician, calm and polished aesthetic
      photoUrl:
        "https://images.unsplash.com/photo-1552498756-415112c43ac3?auto=format&fit=crop&q=80&w=800",
      specialty: "Классика и спа-процедуры",
      bio: "Юки обучалась в прославленной японской традиции ногтевого сервиса и велнеса, где безупречная техника и спокойная атмосфера для клиента ценятся одинаково высоко. Специализируется на классическом маникюре, гель-покрытиях и люкс спа-педикюре — процедурах, к которым относится с тем же трепетом, что и к любому авторскому искусству. Клиенты неизменно отмечают, что сеанс с Юки восстанавливает силы не меньше, чем дарит красоту.",
      // Portfolio: finished classic manicure and spa pedicure results only
      portfolio: [
        "https://images.unsplash.com/photo-1599206676335-193c82b13c9e?auto=format&fit=crop&q=80&w=1200",
        "https://images.unsplash.com/photo-1619615787228-ce0fa8440e18?auto=format&fit=crop&q=80&w=1200",
        "https://images.unsplash.com/photo-1587729927069-ef3b7a5ab9b4?auto=format&fit=crop&q=80&w=1200",
        "https://images.unsplash.com/photo-1457972729786-0411a3b2b626?auto=format&fit=crop&q=80&w=1200",
      ],
      social: {
        instagram: "https://instagram.com/yukitanaka.nails",
      },
      schedule: {
        monday: { isOpen: false, hours: { start: "00:00", end: "00:00" }, breaks: [] },
        tuesday: { isOpen: true, hours: { start: "10:00", end: "19:00" }, breaks: [{ start: "13:00", end: "14:00", label: "Обед" }] },
        wednesday: { isOpen: true, hours: { start: "10:00", end: "19:00" }, breaks: [{ start: "13:00", end: "14:00", label: "Обед" }] },
        thursday: { isOpen: true, hours: { start: "10:00", end: "19:00" }, breaks: [{ start: "13:00", end: "14:00", label: "Обед" }] },
        friday: { isOpen: true, hours: { start: "10:00", end: "19:00" }, breaks: [{ start: "14:00", end: "15:00", label: "Перерыв" }] },
        saturday: { isOpen: true, hours: { start: "10:00", end: "19:00" }, breaks: [] },
        sunday: { isOpen: true, hours: { start: "11:00", end: "17:00" }, breaks: [] },
      },
    },
  ],

  // ─── Testimonials ─────────────────────────────────────────────────────────────
  testimonials: [
    {
      name: "Alessandra Monroe",
      title: "Фэшн-стилист",
      text: "Я побывала в разных студиях Майами — ничто не сравнится с Aura. София нарисовала цветочный дизайн на моих ногтях, и клиенты на съёмке спрашивали, куда я хожу. Предварительная консультация решила всё — она мгновенно уловила мою эстетику.",
      rating: 5,
    },
    {
      name: "Natalie Chen",
      title: "Дизайнер интерьеров",
      text: "Акриловая работа Камиль — в особой категории. Мой набор «гроб» держался пять недель без единого отслоения. Сама студия безупречно чиста, а атмосфера по-настоящему роскошна, а не просто дорога.",
      rating: 5,
    },
    {
      name: "Rachel Torres",
      title: "Директор по маркетингу",
      text: "Я записалась на люкс спа-педикюр к Юки после особенно тяжёлой недели и вышла полностью обновлённой. Внимание к гигиене заметно с первой секунды, а сама процедура стала самым тщательным педикюром в моей жизни. Уже записалась снова.",
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
    "https://images.unsplash.com/photo-1633955726992-2b7c0d2d2a69?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1610992015732-2449b76344bc?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1672405313394-93dff75eae32?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1643648855003-f536c436f399?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1619615787228-ce0fa8440e18?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1690749138086-7422f71dc159?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1599206676335-193c82b13c9e?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1457972729786-0411a3b2b626?auto=format&fit=crop&q=80&w=1200",
  ],

  // ─── Section Copy ─────────────────────────────────────────────────────────────
  sections: {
    services: {
      title: "Блеск и точность",
      subtitle: "Наши услуги",
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
        "https://images.unsplash.com/photo-1633955726992-2b7c0d2d2a69?auto=format&fit=crop&q=80&w=600",
        "https://images.unsplash.com/photo-1571290274554-6a2eaa771e5f?auto=format&fit=crop&q=80&w=600",
        "https://images.unsplash.com/photo-1707725238063-0c54fb6963d1?auto=format&fit=crop&q=80&w=600",
        "https://images.unsplash.com/photo-1674691412909-8405f0a19940?auto=format&fit=crop&q=80&w=600",
      ],
    },
    team: {
      title: "Красота и мастерство // v1.0",
      subtitle: "Мастера",
      description:
        "Каждый мастер Aura Nail Studio выбран не только за техническое совершенство, но и за заботу и творческий интеллект, которые проявляются в каждом взаимодействии с клиентом. Мы — студия специалистов: три направления, один общий стандарт безупречности.",
    },
    whyChooseUs: {
      title: "Наш стандарт",
      subtitle: "Почему выбирают нас",
      // Elegant nail studio interior — clean stations, soft lighting, premium detail
      mainImage:
        "https://images.unsplash.com/photo-1693776528429-f73dd0586329?auto=format&fit=crop&q=80&w=1000",
      badge: "8 лет\nкрасоты",
      benefits: [
        {
          iconName: "ShieldCheck",
          title: "Безупречная гигиена",
          desc: "Каждый инструмент стерилизуется между клиентами, одноразовые материалы утилизируются после каждого сеанса, а рабочие станции дезинфицируются по клиническим стандартам. Ваша безопасность и спокойствие — на первом месте.",
        },
        {
          iconName: "Sparkles",
          title: "Персональная консультация",
          desc: "Перед каждой процедурой мы согласовываем стилевое направление, ваши пожелания и предпочтения по покрытию — чтобы результат был осознанным, носибельным и уникально вашим.",
        },
        {
          iconName: "Palette",
          title: "Настоящий авторский дизайн",
          desc: "Никаких готовых шаблонов, никаких типовых схем. Каждый авторский дизайн в Aura создаётся специально для вас — нарисован вручную и никогда не повторяется.",
        },
        {
          iconName: "Award",
          title: "Только премиальные материалы",
          desc: "Мы используем исключительно профессиональные нетоксичные гель-системы, формулы без HEMA и салонные эксклюзивные бренды. Здоровье ваших ногтей в долгосрочной перспективе для нас так же важно, как и сегодняшний результат.",
        },
      ],
    },
    testimonials: {
      title: "Голоса доверия",
      subtitle: "Что говорят наши клиенты",
    },
    gallery: {
      title: "Искусство в деталях",
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
        "Готовы ощутить точное ногтевое мастерство? Напишите нам, поделитесь любимыми дизайн-референсами, и наша команда свяжется с вами для записи.",
    },
    booking: {
      title: "Записаться на визит",
      tagline:
        "Запишитесь на процедуру и обсудите желаемый образ с мастером до начала сеанса.",
      steps: {
        service: "Услуга",
        staff: "Мастер",
        datetime: "Расписание",
        details: "Подтверждение",
        payment: "Оплата",
      },
      aiConsultant: {
        title: "Нейл-интеллект",
        subtitle: "Не знаете, с чего начать?",
        description:
          "Опишите желаемый образ, и наш виртуальный специалист порекомендует подходящую услугу, мастера и подход — чтобы вы пришли на консультацию полностью подготовленными.",
        agentLabel: "Бьюти-консультант",
        placeholder:
          "Опишите идеальный образ (например: «Нежно-розовые миндалевидные гель-ногти с деликатной золотой детализацией»)...",
      },
      success: {
        title: "Готово",
        confirmed: "Подтверждено!",
        requestSaved: "Заявка сохранена!",
        cancelled: "Отменено",
      },
    },
    instagram: {
      title: "Нейл-вдохновение",
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
        title: "Реестр мастеров",
        scheduleTitle: "Недельное расписание студии",
        commitButton: "Сохранить расписание",
        enforcementTitle: "Контроль расписания",
        enforcementDesc:
          "Расписание мастеров контролируется системой бронирования в реальном времени. Изменения рабочих часов или выходных дней вступают в силу мгновенно, предотвращая двойные записи.",
      },
    },
    faq: {
      title: "Часто задаваемые вопросы",
      subtitle: "Всё о наших услугах маникюра",
      items: [
        { question: "Сколько держится гель?", answer: "Профессиональный гель-маникюр держится 3-4 недели при правильном уходе." },
        { question: "Есть ли нейл-арт?", answer: "Да! От простых дизайнов до сложной ручной росписи. Загляните в нашу галерею." },
        { question: "Снятие геля включено?", answer: "Снятие включено при записи на новый комплект. Отдельное снятие тоже доступно." },
        { question: "Что если ноготь сломается до следующего визита?", answer: "Мы предлагаем бесплатный ремонт в течение первой недели после визита." },
      ],
    },
  },
};
