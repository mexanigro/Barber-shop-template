import type { NichePreset, WorkDay } from "../../types";
import { presetThemePeluqueria } from "./themes";

// Peluquería (BLOQUE-04): misma estructura, catálogo e imágenes que peluqueria.he.ts.

const IMG = "https://images.unsplash.com/photo-";
const q = "?auto=format&fit=crop&q=80&w=";

const WEEKDAY: WorkDay = { isOpen: true, hours: { start: "09:00", end: "20:00" }, breaks: [{ start: "14:00", end: "14:30", label: "Перерыв" }] };
const FRIDAY: WorkDay = { isOpen: true, hours: { start: "08:00", end: "14:00" }, breaks: [] };
const CLOSED: WorkDay = { isOpen: false, hours: { start: "00:00", end: "00:00" }, breaks: [] };

export const peluqueriaPresetRu: NichePreset = {
  businessMode: "team",
  business: {
    type: "peluqueria",
    legalName: "Studio Noa Hair",
    address: "ул. Бялик 24, Рамат-Ган, 5245204, Израиль",
    cancellationPolicy: "Бесплатная отмена за 24 часа; поздняя отмена или неявка — 50% стоимости услуги",
  },

  brand: {
    name: "Studio Noa",
    tagline: "Стрижка, окрашивание и укладка — Рамат-Ган",
    description: "Женская парикмахерская в Рамат-Гане: стрижки, окрашивание и балаяж, укладка феном, выпрямление, причёски на мероприятия и для невест. Запись онлайн или фото в WhatsApp для расчёта стоимости.",
    logoIconName: "Scissors",
    faviconEmoji: "💇‍♀️",
    ogImage: `${IMG}1600948836101-f9ffda59d250${q}1200`,
    aiPersona: "Вы виртуальный ассистент женской парикмахерской в Рамат-Гане. Отвечайте тепло и коротко об услугах, длительности и ценах по прайсу, предлагайте записаться онлайн или отправить фото в WhatsApp для консультации по окрашиванию и выпрямлению.",
  },

  theme: presetThemePeluqueria,

  hero: {
    titlePrefix: "Студия",
    titleHighlight: "для ваших волос",
    titleSuffix: "в Рамат-Гане",
    eyebrow: "Салон в Рамат-Гане",
    subtitle: "Стрижка, окрашивание, укладка и причёски. Запись онлайн или фото в WhatsApp.",
    ctaPrimary: "Записаться",
    ctaSecondary: "Спросить в WhatsApp",
    backgroundImage: `${IMG}1600948836101-f9ffda59d250${q}2000`,
  },

  contact: {
    address: {
      street: "ул. Бялик 24",
      district: "центр Рамат-Гана",
      cityStateZip: "Рамат-Ган, 5245204",
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
    { id: "cut", name: "Женская стрижка", description: "Короткая консультация, мытьё, точная стрижка и сушка. Любая длина, любая текстура.", duration: 60, price: 120, priceMax: 350, mode: "reserva" },
    { id: "cut-blowdry", name: "Стрижка + укладка", description: "Полная стрижка с укладкой феном в финале — уходите готовой.", duration: 90, price: 150, priceMax: 450, mode: "reserva" },
    { id: "blowdry", name: "Укладка феном", description: "Мытьё и гладкая или волнистая укладка. Цена зависит от длины волос.", duration: 45, price: 50, priceMax: 160, mode: "reserva" },
    { id: "root-color", name: "Окрашивание корней", description: "Профессиональное окрашивание корней, мытьё и сушка включены. Рекомендуется каждые 4–6 недель.", duration: 90, price: 130, priceMax: 300, mode: "reserva" },
    { id: "full-color", name: "Полное окрашивание", description: "Ровный цвет от корней до кончиков, в финале увлажняющий уход.", duration: 120, price: 180, priceMax: 600, mode: "reserva" },
    { id: "highlights", name: "Мелирование / балаяж", description: "Постепенное осветление с естественными переходами. Цена зависит от длины, густоты и состояния волос — пришлите фото, и мы посчитаем.", duration: 180, price: 600, priceMax: 1500, mode: "consulta", popular: true },
    { id: "straightening", name: "Выпрямление (кератин / органика)", description: "Держится 4–6 месяцев. Время и цена зависят от длины и состояния волос — нужна консультация.", duration: 240, price: 600, priceMax: 2500, mode: "consulta" },
    { id: "treatment", name: "Уход за волосами (увлажнение / восстановление)", description: "Глубокий уход для сухих, повреждённых или окрашенных волос. Укладка включена.", duration: 60, price: 580, priceMax: 1100, mode: "reserva" },
    { id: "event-style", name: "Причёска на мероприятие", description: "Пучок, локоны или гладкая причёска. Приходите с волосами, вымытыми накануне.", duration: 90, price: 250, priceMax: 800, mode: "reserva" },
    { id: "bride", name: "Свадебная причёска + репетиция", description: "Репетиция и причёска в день свадьбы. Цена зависит от причёски и места — согласуем по телефону.", duration: 120, price: 800, priceMax: 2500, mode: "consulta" },
    { id: "kids-cut", name: "Детская стрижка", description: "Стрижки для детей до 12 лет, терпеливо, в тихие утренние часы.", duration: 30, price: 86, priceMax: 216, mode: "reserva" },
    { id: "consult", name: "Консультация", description: "10–15 минут: диагностика волос и план окрашивания, выпрямления или большой перемены. Вычитается из стоимости процедуры.", duration: 15, price: 0, priceMax: 250, mode: "reserva" },
  ],

  staff: [
    {
      id: "noa",
      slug: "noa-levi",
      name: "Ноа Леви",
      photoUrl: `${IMG}1544717305-2782549b5136${q}800`,
      specialty: "Окрашивание, балаяж и осветление",
      bio: "Владелица студии. 14 лет в окрашивании и осветлении, с акцентом на естественные переходы и здоровые волосы после цвета.",
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
      name: "Майя Коэн",
      photoUrl: `${IMG}1531746020798-e6953c6e8e04${q}800`,
      specialty: "Стрижки и кудрявые волосы",
      bio: "Стрижки по текстуре — прежде всего кудри. Стрижёт насухо, когда нужно, и учит сохранять результат дома.",
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
      name: "Дана Мизрахи",
      photoUrl: `${IMG}1508214751196-bcfd4ca60f91${q}800`,
      specialty: "Причёски на мероприятия и для невест",
      bio: "Причёски, которые держатся до конца ночи. Репетиция для каждой невесты и выезд на локацию в день события.",
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
    { name: "Шира Б.", title: "Отзыв в Google", text: "Отправила фото в WhatsApp, Ноа сразу сказала, что возможно, а что нет, и балаяж получился как на картинке. Волосы остались мягкими после осветления.", rating: 5 },
    { name: "Нета К.", title: "Отзыв в Google", text: "Наконец-то кто-то понимает кудри. Майя стригла насухо, объяснила, что делать дома, и впервые я вышла из салона, не собрав волосы.", rating: 5 },
    { name: "Михаль А.", title: "Отзыв в Google", text: "Причёска на свадьбу сестры — репетиция за неделю, а в день всё вовремя. Продержалась до четырёх утра.", rating: 5 },
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
      title: "Что мы делаем",
      subtitle: "Услуги и цены",
      images: [
        `${IMG}1562322140-8baeececf3df${q}600`,
        `${IMG}1580618672591-eb180b1a973f${q}600`,
        `${IMG}1620331311520-246422fd82f9${q}600`,
        `${IMG}1492106087820-71f1a00d2b11${q}600`,
        `${IMG}1470259078422-826894b933aa${q}600`,
        `${IMG}1508214751196-bcfd4ca60f91${q}600`,
        `${IMG}1524502397800-2eeaad7c3fe5${q}600`,
        `${IMG}1595476108010-b4d1f102b1b1${q}600`,
        `${IMG}1560869713-7d0a29430803${q}600`,
        `${IMG}1519741497674-6114818635${q}600`,
        `${IMG}1503454537195-1dcabb73ffb9${q}600`,
        `${IMG}1595475884562-073c30d45670${q}600`,
      ],
    },
    team: {
      title: "Команда",
      subtitle: "Кто о вас заботится",
      description: "У каждой своя специализация — цвет, кудри или мероприятия. Выберите мастера при записи.",
    },
    whyChooseUs: {
      title: "Почему мы",
      subtitle: "Коротко",
      mainImage: `${IMG}1521590832167-7bcbfaa6381f${q}1000`,
      badge: "Консультация\nперед цветом",
      benefits: [
        { iconName: "MessageCircle", title: "Сначала консультация, без сюрпризов", desc: "Отправьте фото в WhatsApp и получите расчёт до того, как сядете в кресло." },
        { iconName: "Palette", title: "Прозрачные цены", desc: "Диапазон цен на каждую услугу и то, что определяется только после диагностики." },
        { iconName: "Clock", title: "Вовремя", desc: "Онлайн-запись, напоминание за день и никакого ожидания у входа." },
        { iconName: "Sparkles", title: "Сначала здоровье волос", desc: "Осветление и выпрямление — только если волосы это выдержат." },
      ],
    },
    testimonials: {
      title: "Отзывы",
      subtitle: "Что о нас говорят",
    },
    gallery: {
      title: "Из нашего кресла",
      subtitle: "Наши работы",
    },
    location: {
      title: "Рамат-Ган",
      subtitle: "Где мы",
    },
    contact: {
      title: "Контакты",
      subtitle: "Записаться или спросить",
      description: "Онлайн-запись на услуги с фиксированной ценой; для сложного окрашивания, выпрямления или невесты — отправьте фото в WhatsApp, и мы вернёмся с расчётом.",
    },
    beforeAfter: {
      title: "До и после",
      subtitle: "Что можно сделать с вашими волосами",
      cases: [
        { id: "balayage", title: "Естественный балаяж", description: "От однородного тёмно-каштанового к постепенному осветлению без вреда для волос.", treatment: "Мелирование / балаяж", imageBefore: `${IMG}1524502397800-2eeaad7c3fe5${q}1200`, imageAfter: `${IMG}1492106087820-71f1a00d2b11${q}1200` },
        { id: "curls", title: "Стрижка для кудрей", description: "Стрижка насухо по текстуре — объём там, где нужно.", treatment: "Женская стрижка", imageBefore: `${IMG}1519699047748-de8e457a634e${q}1200`, imageAfter: `${IMG}1616683693504-3ea7e9ad6fec${q}1200` },
        { id: "event", title: "Причёска на мероприятие", description: "От повседневных волос к пучку, который держится всю ночь.", treatment: "Причёска на мероприятие", imageBefore: `${IMG}1531746020798-e6953c6e8e04${q}1200`, imageAfter: `${IMG}1560869713-7d0a29430803${q}1200` },
      ],
    },
    booking: {
      title: "Запись",
      tagline: "Стрижка, окрашивание и укладка — Рамат-Ган",
      steps: {
        service: "Услуга",
        staff: "Мастер",
        datetime: "Дата и время",
        details: "Данные",
        payment: "Оплата",
      },
      aiConsultant: {
        title: "Не уверены, что выбрать?",
        subtitle: "Быстрый совет",
        description: "Расскажите о своих волосах и о том, чего хотите, — мы предложим подходящую услугу.",
        agentLabel: "Совет",
        placeholder: "например: длинные окрашенные волосы, хочу светлее без вреда...",
      },
      success: {
        title: "Записано",
        confirmed: "Запись подтверждена!",
        requestSaved: "Заявка сохранена!",
        cancelled: "Отменено",
      },
    },
    instagram: {
      title: "Следите за нашими работами",
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
        title: "Команда",
        scheduleTitle: "Недельная доступность",
        commitButton: "Сохранить расписание",
        enforcementTitle: "Контроль доступности",
        enforcementDesc: "Расписания применяются в реальном времени: изменения доступности или блокировка дня вступают в силу сразу и исключают двойные записи.",
      },
    },
    faq: {
      title: "Частые вопросы",
      subtitle: "Перед записью",
      items: [
        { question: "Сколько длится каждая услуга?", answer: "Стрижка 45–60 мин; укладка 30–45; корни 60–90; полное окрашивание до 2 ч; мелирование и балаяж 2,5–3,5 ч; выпрямление 3–5 ч в зависимости от длины и состояния; причёска на мероприятие 45–90 мин." },
        { question: "Как отменить или перенести запись?", answer: "По ссылке в подтверждении, в WhatsApp или по телефону — бесплатно за 24 часа. Поздняя отмена или неявка могут стоить 50% цены услуги." },
        { question: "Как оплатить?", answer: "Наличными, картой или через Bit в салоне. За выпрямление, полный балаяж и свадебную причёску мы просим предоплату при записи." },
        { question: "Почему нет окончательной цены на мелирование и выпрямление?", answer: "Потому что она зависит от длины, густоты и состояния волос (окрашены? выпрямлялись раньше?). Пришлите фото волос при дневном свете в WhatsApp — посчитаем, или запишитесь на консультацию 10–15 минут." },
        { question: "Стрижёте детей?", answer: "Да, до 12 лет. Лучше утром, когда в салоне тихо." },
        { question: "Есть мастер по кудрям?", answer: "Да — Майя. Выберите её при записи и приходите с волосами такими, какие они у вас каждый день." },
      ],
    },
  },
};
