import type { NichePreset } from "../../types";
import { presetThemeRemodelaciones } from "./themes";

export const remodelacionesPresetRu: NichePreset = {
  businessMode: "team",
  business: {
    type: "remodelaciones",
    legalName: "BrushCraft Painting Pty Ltd",
    address: "Sydney, NSW, Australia",
    cancellationPolicy: "За 48 часов до назначенной даты начала",
  },

  brand: {
    name: "BrushCraft",
    tagline: "Профессиональная покраска домов в Сиднее",
    description: "Профессиональные услуги внутренней и наружной покраски. Лицензированные, застрахованные, с гарантией качества.",
    logoIconName: "Paintbrush",
    faviconEmoji: "🏠",
    aiPersona: "Ты виртуальный консультант профессиональной малярной компании. Помоги клиентам понять наши услуги, получить расценки и узнать о нашем процессе. Будь профессиональным и полезным.",
  },

  theme: presetThemeRemodelaciones,

  hero: {
    titlePrefix: "МЫ ПРЕОБРАЖАЕМ",
    titleHighlight: "ВАШ ДОМ",
    titleSuffix: "ИДЕАЛЬНОЙ ОТДЕЛКОЙ",
    subtitle: "Внутренняя и наружная покраска для домов и бизнеса. Лицензия, страховка и гарантия качества.",
    ctaPrimary: "БЕСПЛАТНАЯ ОЦЕНКА",
    ctaSecondary: "НАШИ РАБОТЫ",
    backgroundImage: "https://images.unsplash.com/photo-1562259949-e8e7689d7828?auto=format&fit=crop&q=80&w=2000",
    variant: "slider",
    beforeImage: "https://images.pexels.com/photos/804392/pexels-photo-804392.jpeg?auto=compress&cs=tinysrgb&w=1600",
    afterImage: "https://images.pexels.com/photos/7031616/pexels-photo-7031616.jpeg?auto=compress&cs=tinysrgb&w=1600",
    stats: [
      { value: "500+", label: "Домов покрашено" },
      { value: "15+", label: "Лет опыта" },
      { value: "100%", label: "Удовлетворённость" },
    ],
  },

  contact: {
    address: {
      street: "42 Painter's Lane",
      district: "Inner West",
      cityStateZip: "Sydney, NSW 2000",
    },
    phone: "+61 4XX XXX XXX",
    email: "hello@brushcraftpainting.com.au",
    social: {
      instagram: "https://instagram.com/brushcraftpainting",
      facebook: "https://facebook.com/brushcraftpainting",
    },
  },

  hours: {
    monday: { start: "07:00", end: "17:00" },
    tuesday: { start: "07:00", end: "17:00" },
    wednesday: { start: "07:00", end: "17:00" },
    thursday: { start: "07:00", end: "17:00" },
    friday: { start: "07:00", end: "16:00" },
    saturday: { start: "08:00", end: "13:00" },
    sunday: null,
  },

  services: [
    { id: "consultation", name: "Бесплатная консультация", description: "Мы приезжаем, обсуждаем цвета и предоставляем подробную смету. Без обязательств.", duration: 60, price: 0, fromPrice: "БЕСПЛАТНО", popular: true, features: ["Консультация по цветам на месте", "Смета в течение 24 часов", "Без обязательств", "Экспертный совет по краскам"] },
    { id: "interior", name: "Внутренняя покраска", description: "Полная внутренняя покраска: стены, потолки, плинтусы и акцентные стены премиальными красками.", duration: 0, price: 1200, fromPrice: "от $1,200", features: ["Стены и потолки", "Плинтусы и наличники", "Акцентные стены", "Консультация по цветам включена"] },
    { id: "exterior", name: "Наружная покраска", description: "Полная наружная покраска с атмосферостойкими покрытиями для долговечной защиты.", duration: 0, price: 2500, fromPrice: "от $2,500", features: ["Наружные стены", "Карнизы и водостоки", "Оконные рамы и двери", "Атмосферостойкие покрытия"] },
    { id: "deck-fence", name: "Покраска террас и заборов", description: "Покраска деревянных террас и заборов с защитой от UV и погоды.", duration: 0, price: 800, fromPrice: "от $800", features: ["Покраска деревянной террасы", "Покраска заборов", "Мойка под давлением включена", "UV и атмосферная защита"] },
  ],

  staff: [
    { id: "lead-painter", slug: "lead-painter", name: "Главный маляр", specialty: "Руководитель проектов", bio: "15+ лет опыта в жилой и коммерческой покраске.", photoUrl: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&q=80&w=800", portfolio: [], schedule: { monday: { isOpen: true, hours: { start: "07:00", end: "17:00" }, breaks: [] }, tuesday: { isOpen: true, hours: { start: "07:00", end: "17:00" }, breaks: [] }, wednesday: { isOpen: true, hours: { start: "07:00", end: "17:00" }, breaks: [] }, thursday: { isOpen: true, hours: { start: "07:00", end: "17:00" }, breaks: [] }, friday: { isOpen: true, hours: { start: "07:00", end: "16:00" }, breaks: [] }, saturday: { isOpen: false, hours: { start: "08:00", end: "13:00" }, breaks: [] }, sunday: { isOpen: false, hours: { start: "09:00", end: "17:00" }, breaks: [] } } },
  ],

  testimonials: [
    { name: "Сара М.", title: "Домовладелица", text: "Блестящая работа снаружи. Команда пунктуальная, чистая, а отделка безупречная. Очень рекомендую!", rating: 5 },
    { name: "Джеймс В.", title: "Домовладелец", text: "Покрасили весь интерьер за четыре дня без проблем. Профессионально, быстро и отличные советы по цветам.", rating: 5 },
    { name: "Линда Т.", title: "Управляющая недвижимостью", text: "Мы используем BrushCraft для всех перекрасок. Надёжные, справедливые цены, арендаторам всегда нравится результат.", rating: 5 },
  ],

  gallery: [
    "https://images.unsplash.com/photo-1562259949-e8e7689d7828?auto=format&fit=crop&q=80&w=800",
    "https://images.unsplash.com/photo-1589939705384-5185137a7f0f?auto=format&fit=crop&q=80&w=800",
    "https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&q=80&w=800",
    "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&q=80&w=800",
  ],

  sections: {
    services: { title: "Наши услуги", subtitle: "Профессиональные малярные решения для каждого проекта", images: ["https://images.unsplash.com/photo-1562259949-e8e7689d7828?auto=format&fit=crop&q=80&w=800", "https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&q=80&w=800", "https://images.unsplash.com/photo-1589939705384-5185137a7f0f?auto=format&fit=crop&q=80&w=800", "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&q=80&w=800"] },
    team: { title: "Наша команда", subtitle: "Лицензированные опытные маляры", description: "Наша команда мастеров привносит годы опыта и внимание к деталям в каждый проект." },
    whyChooseUs: {
      title: "Почему мы",
      subtitle: "Качество, которому можно доверять",
      benefits: [
        { title: "Лицензия и страховка", desc: "Полная лицензия и страховка для вашего спокойствия.", iconName: "Shield" },
        { title: "Премиальные краски", desc: "Используем только премиальные краски в каждой работе.", iconName: "Droplets" },
        { title: "Тщательная подготовка", desc: "Шпатлёвка, шлифовка, грунтовка — для долговечного результата.", iconName: "Hammer" },
        { title: "В срок и в бюджете", desc: "Уважаем ваш график и выполняем как обещали.", iconName: "Clock" },
        { title: "Чистая площадка", desc: "Относимся к вашей собственности как к своей — чистота каждый день.", iconName: "Sparkles" },
        { title: "Гарантия качества", desc: "Письменная гарантия на все работы.", iconName: "Award" },
      ],
      mainImage: "https://images.unsplash.com/photo-1562259949-e8e7689d7828?auto=format&fit=crop&q=80&w=800",
      badge: "Лицензированные маляры",
    },
    testimonials: { title: "Отзывы клиентов", subtitle: "5.0 в Google Отзывах" },
    gallery: { title: "Наши работы", subtitle: "Преображения до и после" },
    location: { title: "Зона обслуживания", subtitle: "Сидней и большой Новый Южный Уэльс" },
    contact: { title: "Получить расценку", subtitle: "Бесплатная оценка без обязательств", description: "Расскажите о проекте — мы предоставим смету в течение 24 часов." },
    booking: {
      title: "Записаться на консультацию",
      tagline: "Бесплатная консультация по цветам на месте",
      steps: { service: "Тип услуги", staff: "Консультант", datetime: "Желаемая дата", details: "Ваши данные", payment: "Подтверждение" },
      aiConsultant: { title: "Советник по проектам", subtitle: "Не уверены, что нужно?", description: "Наш AI-советник поможет определить подходящие услуги для вашего проекта.", agentLabel: "Советник AI", placeholder: "Опишите ваш проект покраски..." },
      success: { title: "Консультация назначена", confirmed: "Мы свяжемся для подтверждения!", requestSaved: "Ваш запрос сохранён.", cancelled: "Бронирование отменено." },
    },
    admin: { staff: { title: "Управление командой", scheduleTitle: "Графики", commitButton: "Сохранить", enforcementTitle: "Доступность", enforcementDesc: "Настройка доступности команды." } },
    process: {
      title: "Как мы работаем",
      subtitle: "Проверенный 4-этапный процесс",
      steps: [
        { number: "01", title: "Бесплатная консультация", description: "Приезжаем, обсуждаем цвета, предоставляем подробную смету. Без обязательств.", iconName: "MessageCircle" },
        { number: "02", title: "Подготовка и защита", description: "Маскировка, шлифовка, заполнение трещин и грунтовка для идеальной адгезии.", iconName: "ClipboardList" },
        { number: "03", title: "Покраска и преображение", description: "Опытные маляры наносят премиальные краски с точностью: чистые линии, равномерное покрытие.", iconName: "Paintbrush" },
        { number: "04", title: "Финальный осмотр", description: "Проверяем каждую деталь вместе с вами и уходим только когда вы на 100% довольны.", iconName: "CheckCircle" },
      ],
    },
    portfolio: {
      title: "Наши проекты",
      subtitle: "Недавние работы",
      filters: [
        { key: "all", label: "Все" },
        { key: "interior", label: "Интерьер" },
        { key: "exterior", label: "Экстерьер" },
      ],
      projects: [
        {
          title: "Деревянный дом", type: "Наружная покраска", description: "Полная наружная покраска классического деревянного дома. Удаление старой краски, заполнение трещин и два слоя атмосферостойкой краски.", duration: "5 дней", size: "220 м²", filter: "exterior",
          images: ["https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&q=80&w=800"],
          gallery: [
            { before: "https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?auto=format&fit=crop&q=80&w=600", after: "https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&q=80&w=600", caption: "Фасад" },
            { before: "https://images.unsplash.com/photo-1459767129954-1b1c1f9b9ace?auto=format&fit=crop&q=80&w=600", after: "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&q=80&w=600", caption: "Боковой фасад" },
          ],
        },
        {
          title: "Квартира в центре", type: "Внутренний ремонт", description: "Полная внутренняя покраска: стены, потолки, плинтусы в современной нейтральной палитре.", duration: "4 дня", size: "150 м²", filter: "interior",
          images: ["https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&q=80&w=800"],
          gallery: [
            { before: "https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&q=80&w=600", after: "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&q=80&w=600", caption: "Гостиная" },
            { before: "https://images.unsplash.com/photo-1560448204-603b3fc33ddc?auto=format&fit=crop&q=80&w=600", after: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&q=80&w=600", caption: "Кухня" },
          ],
        },
        {
          title: "Семейный дом", type: "Полный экстерьер", description: "Большой двухэтажный дом. Мойка, герметизация трещин и покраска в серой палитре с белой отделкой.", duration: "6 дней", size: "310 м²", filter: "exterior",
          images: ["https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&q=80&w=800"],
          gallery: [
            { before: "https://images.unsplash.com/photo-1430285561322-7808604715df?auto=format&fit=crop&q=80&w=600", after: "https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&q=80&w=600", caption: "Вид с улицы" },
          ],
        },
        {
          title: "Вилла на побережье", type: "Экстерьер и терраса", description: "Полная наружная покраска плюс покраска террасы солестойкими UV-стабильными покрытиями.", duration: "7 дней", size: "400 м²", filter: "exterior",
          images: ["https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&q=80&w=800"],
          gallery: [
            { before: "https://images.unsplash.com/photo-1523217582562-09d0def993a6?auto=format&fit=crop&q=80&w=600", after: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&q=80&w=600", caption: "Фасад и терраса" },
          ],
        },
      ],
    },
    faq: {
      title: "Часто задаваемые вопросы",
      subtitle: "Частые вопросы о наших услугах",
      items: [
        { question: "Сколько времени занимает проект?", answer: "Сроки зависят от объёма. Одна комната — 3-5 дней, полный ремонт — 2-6 недель." },
        { question: "Предоставляете бесплатную оценку?", answer: "Да! Бесплатная консультация на месте и подробная смета без обязательств." },
        { question: "У вас есть лицензия и страховка?", answer: "Полностью лицензированы и застрахованы. Предоставляем сертификаты по запросу." },
        { question: "Нужно ли выезжать на время ремонта?", answer: "В большинстве случаев нет. Работаем по участкам и убираем в конце каждого дня." },
      ],
    },
  },
};
