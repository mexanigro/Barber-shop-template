import type { NichePreset } from "../../types";
import { presetThemeCafeteria } from "./themes";

export const cafeteriaPresetRu: NichePreset = {
  businessMode: "team",
  business: {
    type: "cafeteria",
    legalName: "Aroma Vivo Coffee LLC",
    address: "Av. del Libertador 2840, Palermo, Buenos Aires, Argentina",
    cancellationPolicy: "За 24 часа до назначенного времени",
  },

  brand: {
    name: "Aroma Vivo",
    tagline: "Спешелти кофе малой обжарки",
    description: "Спешелти кофе, обжаренный с заботой. Каждая чашка — это церемония вкуса и мастерства.",
    logoIconName: "Coffee",
    aiPersona: "Ты виртуальный бариста и эксперт по кофе. Помоги клиентам открыть наше меню, узнать о процессе обжарки и найти идеальный напиток по их вкусу. Будь тёплым и компетентным.",
  },

  theme: presetThemeCafeteria,

  hero: {
    titlePrefix: "РЕМЕСЛЕННАЯ",
    titleHighlight: "ОБЖАРКА",
    titleSuffix: "С 2024 ГОДА",
    subtitle: "Каждая чашка рассказывает историю. Позвольте кофе говорить до первого глотка.",
    ctaPrimary: "НАШЕ МЕНЮ",
    ctaSecondary: "НАШ ПРОЦЕСС",
    backgroundImage: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&q=80&w=2000",
  },

  contact: {
    address: {
      street: "Av. del Libertador 2840",
      district: "Палермо",
      cityStateZip: "Буэнос-Айрес, Аргентина",
    },
    phone: "+54 11 4567-8901",
    email: "hello@aromavivo.com",
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
    friday: { start: "07:00", end: "20:00" },
    saturday: { start: "08:00", end: "21:00" },
    sunday: { start: "09:00", end: "18:00" },
  },

  services: [
    { id: "espresso", name: "Классический эспрессо", subtitle: "Чистая душа", description: "Интенсивный, кремовый и полнотелый. Двойной шот, раскрывающий характер зерна.", duration: 0, price: 0, category: "hot", image: "/images/menu/espresso.jpg" },
    { id: "cappuccino", name: "Нежный капучино", subtitle: "Облако пены", description: "Шелковистая пена над двойным эспрессо с микропузырьками, тающими на нёбе.", duration: 0, price: 0, category: "hot", image: "/images/menu/cappuccino.jpg" },
    { id: "flat-white", name: "Флэт уайт", subtitle: "Жидкий шёлк", description: "Идеальная микропена над двойным ристретто. Фаворит ценителей кофе.", duration: 0, price: 0, category: "hot", image: "/images/menu/flatwhite.jpg" },
    { id: "cold-brew", name: "Колд брю", subtitle: "Ледяное терпение", description: "12-часовая холодная экстракция. Мягкий, сладкий и освежающе чистый.", duration: 0, price: 0, category: "cold", image: "/images/menu/coldbrew.jpg" },
    { id: "iced-latte", name: "Айс латте", subtitle: "Лёд и страсть", description: "Кремовое молоко и сбалансированный эспрессо со льдом.", duration: 0, price: 0, category: "cold", image: "/images/menu/icedlatte.jpg" },
    { id: "frappe-moka", name: "Фраппе мока", subtitle: "Сладкое удовольствие", description: "Кофе, шоколад и взбитые сливки в десертном стиле.", duration: 0, price: 0, category: "cold", image: "/images/menu/frappemoka.jpg" },
    { id: "tiramisu", name: "Домашний тирамису", subtitle: "Слои радости", description: "Слои кофе, маскарпоне и какао. Совершенный семейный рецепт.", duration: 0, price: 0, category: "desserts", image: "/images/menu/tiramisu.jpg" },
    { id: "cheesecake", name: "Карамельный чизкейк", subtitle: "Сладкий баланс", description: "Основа из печенья, сливочный сыр и солёная карамель.", duration: 0, price: 0, category: "desserts", image: "/images/menu/cheesecake.jpg" },
  ],

  staff: [
    { id: "lucas", slug: "lucas-fernandez", name: "Лукас Фернандес", specialty: "Главный бариста и основатель", bio: "Бывший чемпион латте-арта с 10-летним опытом в спешелти кофе.", photoUrl: "", portfolio: [], schedule: { monday: { isOpen: true, hours: { start: "07:00", end: "20:00" }, breaks: [] }, tuesday: { isOpen: true, hours: { start: "07:00", end: "20:00" }, breaks: [] }, wednesday: { isOpen: true, hours: { start: "07:00", end: "20:00" }, breaks: [] }, thursday: { isOpen: true, hours: { start: "07:00", end: "20:00" }, breaks: [] }, friday: { isOpen: true, hours: { start: "07:00", end: "20:00" }, breaks: [] }, saturday: { isOpen: true, hours: { start: "08:00", end: "21:00" }, breaks: [] }, sunday: { isOpen: false, hours: { start: "09:00", end: "18:00" }, breaks: [] } } },
    { id: "martina", slug: "martina-lopez", name: "Мартина Лопес", specialty: "Старший бариста", bio: "Специалист по экстракции и колд брю с высокотренированным нёбом.", photoUrl: "", portfolio: [], schedule: { monday: { isOpen: true, hours: { start: "07:00", end: "20:00" }, breaks: [] }, tuesday: { isOpen: true, hours: { start: "07:00", end: "20:00" }, breaks: [] }, wednesday: { isOpen: true, hours: { start: "07:00", end: "20:00" }, breaks: [] }, thursday: { isOpen: true, hours: { start: "07:00", end: "20:00" }, breaks: [] }, friday: { isOpen: true, hours: { start: "07:00", end: "20:00" }, breaks: [] }, saturday: { isOpen: true, hours: { start: "08:00", end: "21:00" }, breaks: [] }, sunday: { isOpen: false, hours: { start: "09:00", end: "18:00" }, breaks: [] } } },
    { id: "santiago", slug: "santiago-ruiz", name: "Сантьяго Руис", specialty: "Обжарщик", bio: "Мастер медленного огня, относящийся к каждому профилю обжарки как к произведению искусства.", photoUrl: "", portfolio: [], schedule: { monday: { isOpen: true, hours: { start: "07:00", end: "20:00" }, breaks: [] }, tuesday: { isOpen: true, hours: { start: "07:00", end: "20:00" }, breaks: [] }, wednesday: { isOpen: true, hours: { start: "07:00", end: "20:00" }, breaks: [] }, thursday: { isOpen: true, hours: { start: "07:00", end: "20:00" }, breaks: [] }, friday: { isOpen: true, hours: { start: "07:00", end: "20:00" }, breaks: [] }, saturday: { isOpen: false, hours: { start: "08:00", end: "21:00" }, breaks: [] }, sunday: { isOpen: false, hours: { start: "09:00", end: "18:00" }, breaks: [] } } },
  ],

  testimonials: [
    { name: "Валентина Р.", title: "Постоянная клиентка", text: "Лучший эспрессо, что я пробовала. Чувствуется, что зёрна выбираются тщательно и экстракция безупречна.", rating: 5 },
    { name: "Мартин Л.", title: "Утренний постоянный", text: "Прихожу каждое утро перед работой. Флэт уайт — моя религия. Атмосфера заставляет хотеть остаться.", rating: 5 },
    { name: "Камила С.", title: "Выходной посетитель", text: "Партнёр привёл меня на колд брю, и теперь мы постоянные. Тирамису — на другом уровне.", rating: 5 },
    { name: "Андрес П.", title: "Удалённый работник", text: "Работаю удалённо и это моё место. Быстрый Wi-Fi, розетки, отличный кофе и спокойная атмосфера.", rating: 5 },
    { name: "София М.", title: "Новая клиентка", text: "Нашла Aroma Vivo на Google Maps и фото не врут. Качество кофе и обслуживание превосходят ожидания.", rating: 5 },
  ],

  gallery: [
    "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&q=80&w=800",
    "https://images.unsplash.com/photo-1442512595331-e89e73853f31?auto=format&fit=crop&q=80&w=800",
    "https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&q=80&w=800",
    "https://images.unsplash.com/photo-1498804103079-a6351b050096?auto=format&fit=crop&q=80&w=800",
  ],

  sections: {
    services: { title: "Наше меню", subtitle: "Авторские творения, созданные с заботой", images: [] },
    team: { title: "Кто мы", subtitle: "Руки, творящие магию", description: "Увлечённые мастера, преданные искусству спешелти кофе." },
    whyChooseUs: {
      title: "Наше отличие",
      subtitle: "Что делает каждую чашку особенной",
      benefits: [
        { title: "Зёрна одного происхождения", desc: "Мы закупаем у лучших ферм Колумбии, Эфиопии и Бразилии.", iconName: "Leaf" },
        { title: "Обжарка малыми партиями", desc: "Каждая партия обжаривается вручную для максимального раскрытия вкуса.", iconName: "Flame" },
        { title: "Экспертные бариста", desc: "Тренированное нёбо, калибрующее каждую экстракцию до совершенства.", iconName: "Award" },
        { title: "Спокойная атмосфера", desc: "Спроектировано так, чтобы каждый визит ощущался как осознанная пауза.", iconName: "Sun" },
      ],
      mainImage: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&q=80&w=800",
      badge: "Спешелти кофе",
    },
    testimonials: { title: "Что о нас говорят", subtitle: "4.9 на Google Maps" },
    gallery: { title: "Наше пространство", subtitle: "Убежище для ваших чувств" },
    location: { title: "Навестите нас", subtitle: "Мы готовы с вашей чашкой" },
    contact: { title: "Свяжитесь с нами", subtitle: "Будем рады вас слышать", description: "Вопрос о меню, мероприятиях или оптовом кофе? Напишите нам." },
    booking: {
      title: "Бронирование столика",
      tagline: "Для групп и особых случаев",
      steps: { service: "Тип события", staff: "Хост", datetime: "Дата и время", details: "Ваши данные", payment: "Подтверждение" },
      aiConsultant: { title: "Гид по кофе", subtitle: "Не знаете что заказать?", description: "Наш AI-бариста порекомендует идеальный напиток по вашим предпочтениям.", agentLabel: "Бариста AI", placeholder: "Какой кофе вам нравится?" },
      success: { title: "Бронирование подтверждено", confirmed: "Ваш столик будет готов!", requestSaved: "Ваш запрос сохранён.", cancelled: "Бронирование отменено." },
    },
    admin: { staff: { title: "Управление командой", scheduleTitle: "Графики", commitButton: "Сохранить", enforcementTitle: "Правила смен", enforcementDesc: "Настройка доступности команды." } },
    philosophy: {
      title: "Наша суть",
      subtitle: "Больше чем чашка — ритуал",
      intro: "Мы верим, что кофе — это ритуал, заслуживающий времени, внимания и уважения. От зерна до чашки каждый шаг — осознанное решение к совершенству.",
      pillars: [
        { number: "01", title: "Происхождение", description: "Мы выбираем зёрна с устойчивых ферм на идеальных высотах для уникальных вкусовых профилей." },
        { number: "02", title: "Обжарка", description: "Каждая партия обжаривается вручную малыми лотами, сохраняя характер каждого происхождения." },
        { number: "03", title: "Экстракция", description: "Наши бариста балансируют сладость, кислотность и тело для лучшего выражения зерна." },
      ],
    },
    process: {
      title: "От фермы до чашки",
      subtitle: "Осознанный процесс",
      intro: "Это больше чем кофе. Это цепь осознанных решений, уважающих зерно, фермера и человека.",
      steps: [
        { number: "01", title: "Отбор", description: "Мы выбираем зёрна с лучших ферм Колумбии, Эфиопии и Бразилии. Только 1% проходит наш фильтр." },
        { number: "02", title: "Ремесленная обжарка", description: "Каждая партия обжаривается вручную с точным контролем температуры и времени." },
        { number: "03", title: "Контролируемый отдых", description: "Зёрна отдыхают 48 часов в климат-контроле для стабилизации масел и концентрации вкусов." },
        { number: "04", title: "Идеальная экстракция", description: "Бариста калибруют температуру, помол и давление для лучшей экстракции каждого зерна." },
      ],
    },
    ambience: {
      title: "Пространство",
      subtitle: "Убежище для ваших чувств",
      intro: "Спроектировано так, чтобы каждый визит ощущался как осознанная пауза — с порога ритм меняется.",
      sectors: [
        { label: "Главный зал", body: "Свет от пола до потолка омывает столы из светлого дуба. Ничто не конкурирует с ароматом от бара.", imageSrc: "https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&q=80&w=800" },
        { label: "Кофе-бар", body: "Бар в центре — не как барьер, а как сцена. Наблюдайте за взвешиванием, помолом и наливом без спешки.", imageSrc: "https://images.unsplash.com/photo-1453614512568-c4024d13c247?auto=format&fit=crop&q=80&w=800" },
        { label: "Тихие углы", body: "По периметру уютные уголки с тёплыми лампами приветствуют ноутбуки, блокноты или тихую беседу.", imageSrc: "https://images.unsplash.com/photo-1521017432531-fbd92d768814?auto=format&fit=crop&q=80&w=800" },
      ],
    },
    menu: {
      title: "Наше меню",
      subtitle: "Авторские творения, созданные с заботой",
      categories: [
        { key: "all", label: "Все" },
        { key: "hot", label: "Горячие" },
        { key: "cold", label: "Холодные" },
        { key: "desserts", label: "Десерты" },
      ],
      items: [
        { id: "espresso", name: "Классический эспрессо", subtitle: "Чистая душа", description: "Интенсивный, кремовый и полнотелый. Двойной шот, раскрывающий характер зерна.", category: "hot", image: "https://images.unsplash.com/photo-1510707577719-ae7c14805e3a?auto=format&fit=crop&q=80&w=600" },
        { id: "cappuccino", name: "Нежный капучино", subtitle: "Облако пенки", description: "Шёлковая пенка поверх двойного эспрессо с микропузырьками, тающими на нёбе.", category: "hot", image: "https://images.unsplash.com/photo-1572442388796-11668a67e53d?auto=format&fit=crop&q=80&w=600" },
        { id: "flat-white", name: "Флэт уайт", subtitle: "Жидкий шёлк", description: "Идеальная микропенка поверх двойного ристретто. Фаворит ценителей кофе.", category: "hot", image: "https://images.unsplash.com/photo-1577968897966-3d4325b36b61?auto=format&fit=crop&q=80&w=600" },
        { id: "cold-brew", name: "Колд брю", subtitle: "Ледяное терпение", description: "12-часовая холодная экстракция. Мягкий, сладкий и освежающе чистый.", category: "cold", image: "https://images.unsplash.com/photo-1461023058943-07fcbe16d735?auto=format&fit=crop&q=80&w=600" },
        { id: "iced-latte", name: "Айс латте", subtitle: "Лёд и страсть", description: "Кремовое молоко и сбалансированный эспрессо на льду. Идеально освежает.", category: "cold", image: "https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?auto=format&fit=crop&q=80&w=600" },
        { id: "frappe-moka", name: "Фраппе мока", subtitle: "Сладкое удовольствие", description: "Кофе, шоколад и взбитые сливки в десертном стиле.", category: "cold", image: "https://images.unsplash.com/photo-1579888944880-d98341245702?auto=format&fit=crop&q=80&w=600" },
        { id: "tiramisu", name: "Домашний тирамису", subtitle: "Слои радости", description: "Слои кофе, маскарпоне и какао. Семейный рецепт, доведённый до совершенства.", category: "desserts", image: "https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?auto=format&fit=crop&q=80&w=600" },
        { id: "cheesecake", name: "Карамельный чизкейк", subtitle: "Сладкий баланс", description: "Бисквитная основа, крем-сыр и соус из солёной карамели.", category: "desserts", image: "https://images.unsplash.com/photo-1524351199432-d330df18e1cd?auto=format&fit=crop&q=80&w=600" },
      ],
    },
    faq: {
      title: "Часто задаваемые вопросы",
      subtitle: "Полезно знать перед визитом",
      items: [
        { question: "Принимаете бронирования?", answer: "Мы работаем по порядку прихода. Для групп от 6 человек, пожалуйста, позвоните заранее." },
        { question: "Есть веганские/безглютеновые блюда?", answer: "Да! У нас чётко отмечены веганские, вегетарианские и безглютеновые варианты." },
        { question: "Есть Wi-Fi?", answer: "Бесплатный скоростной Wi-Fi для всех гостей. Спросите пароль у персонала." },
        { question: "Можно работать с ноутбуком?", answer: "Конечно! У нас много розеток и тихий уголок для удалённой работы." },
      ],
    },
  },
};
