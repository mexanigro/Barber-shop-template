export interface TourStep {
  title: string;
  description: string;
}

export interface TourTranslations {
  welcome: TourStep;
  hero: TourStep;
  services: TourStep;
  booking: TourStep;
  whyChooseUs: TourStep;
  team: TourStep;
  gallery: TourStep;
  testimonials: TourStep;
  contact: TourStep;
  businessHours: TourStep;
  location: TourStep;
  ai: TourStep;
  adminIntro: TourStep;
  crmOverview: TourStep;
  crmAppointments: TourStep;
  crmCustomers: TourStep;
  crmInbox: TourStep;
  crmStaff: TourStep;
  crmRules: TourStep;
  closing: TourStep & {
    ctaBuy: string;
    ctaEnd: string;
    priceLabel: string;
    priceValue: string;
    priceNote: string;
    included: string[];
  };
  buttons: { next: string; prev: string; start: string; letsGo: string; skip: string };
  tourButton: string;
}

const he: TourTranslations = {
  welcome: {
    title: "ברוכים הבאים לאתר שלך 👋",
    description:
      "מה שאתה עומד לראות הוא אתר שנבנה במיוחד בשבילך. תוך דקה אני אראה לך את כל מה שכלול: מהאתר שהלקוחות שלך רואים, ועד למערכת הניהול שתעזור לך לנהל את העסק ביום-יום.",
  },
  hero: {
    title: "הרושם הראשון של הלקוח",
    description:
      "הדבר הראשון שכל לקוח חדש רואה. התמונות, הצבעים והטקסט מותאמים אישית לעסק שלך. זה מה שנותן לך נוכחות דיגיטלית מקצועית.",
  },
  services: {
    title: "השירותים שלך, במרכז",
    description:
      "כל שירות עם שם, מחיר, תיאור ותמונה. הלקוח רואה בדיוק מה אתה מציע ומזמין ישירות. אתה עורך הכל בלחיצה.",
  },
  booking: {
    title: "תורים נכנסים אוטומטית",
    description:
      "הלקוח בוחר שירות, תאריך ושעה ומאשר. התור נכנס ישר למערכת שלך. בלי טלפונים, בלי וואטסאפ, בלי שכחה.",
  },
  whyChooseUs: {
    title: "למה דווקא אתה",
    description:
      "הקטע שמשכנע לקוחות חדשים. מציג את היתרונות הייחודיים שלך ובונה אמון עוד לפני שהם מגיעים אליך.",
  },
  team: {
    title: "הצוות שמאחורי העסק",
    description:
      "כל חבר צוות עם תמונה, תיאור ולינק לעמוד אישי. לקוחות אוהבים לדעת מי מטפל בהם עוד לפני שהם מגיעים.",
  },
  gallery: {
    title: "העבודות מדברות",
    description:
      "גלריית תמונות שמציגה את הרמה שלך. הוכחה ויזואלית שבונה אמון ומביאה לקוחות חדשים.",
  },
  testimonials: {
    title: "הלקוחות שלך מוכרים בשבילך",
    description:
      "ביקורות אמיתיות שבונות אמון. כשלקוח פוטנציאלי רואה שאחרים מרוצים, הוא מזמין.",
  },
  contact: {
    title: "קו ישיר ללקוחות",
    description:
      "טופס קשר שמגיע ישירות למערכת שלך. לקוח כותב, אתה רואה מיד. אף הודעה לא הולכת לאיבוד.",
  },
  businessHours: {
    title: "שעות פעילות ברורות",
    description:
      "הלקוחות תמיד יודעים מתי אתה פתוח. אתה משנה מהמערכת והאתר מתעדכן לבד.",
  },
  location: {
    title: "קל למצוא אותך",
    description:
      "מפה אינטראקטיבית עם הכתובת המדויקת שלך. הלקוחות מגיעים אליך בלי להתקשר לשאול.",
  },
  ai: {
    title: "עוזר חכם שעובד 24/7",
    description:
      "צ'אטבוט שמכיר את העסק שלך. עונה על שאלות, ממליץ על שירותים ועוזר ללקוחות גם כשאתה ישן או עסוק עם לקוח. בינה מלאכותית שעובדת בשבילך.",
  },
  adminIntro: {
    title: "עכשיו בוא נראה את הקסם האמיתי ✨",
    description:
      "כל מה שראית עד עכשיו הוא מה שהלקוח רואה. עכשיו אני אראה לך את מערכת הניהול שלך. מכאן אתה שולט על הכל.",
  },
  crmOverview: {
    title: "הכל במבט אחד",
    description:
      "כמה תורים יש היום, מי הלקוח הבא, כמה הכנסת החודש. בלי לחפש, בלי לזכור. אתה פותח ורואה.",
  },
  crmAppointments: {
    title: "התורים שלך, מסודרים",
    description:
      "כל תור שנקבע מופיע כאן. אתה מאשר, מבטל או משנה. לקוח מגיע בלי תור? מוסיף אותו ישר מפה.",
  },
  crmCustomers: {
    title: "כל הלקוחות במקום אחד",
    description:
      "היסטוריה מלאה של כל לקוח: תורים, ביקורים, העדפות. אתה מכיר את הלקוח שלך יותר טוב מכל מחברת.",
  },
  crmInbox: {
    title: "הודעות ישירות מהאתר",
    description:
      "כל הודעה שלקוח שולח דרך האתר מגיעה לפה. אתה קורא, מגיב ושומר הכל מסודר.",
  },
  crmStaff: {
    title: "ניהול הצוות",
    description:
      "לכל חבר צוות לוח זמנים, ימי חופש ושעות עבודה. המערכת מונעת התנגשויות ומסדרת הכל לבד.",
  },
  crmRules: {
    title: "הכללים שלך, המערכת מבצעת",
    description:
      "זמן מינימום להזמנה, הפסקות בין תורים, אישור אוטומטי. אתה מגדיר פעם אחת והמערכת עובדת לפי הכללים שלך.",
  },
  closing: {
    title: "הכל כאן, מוכן בשבילך",
    description:
      "אתר מקצועי, מערכת תורים, ניהול לקוחות, בינה מלאכותית, תחזוקה ותמיכה מלאה. הכל כלול במנוי אחד פשוט.",
    ctaBuy: "אני רוצה להתחיל",
    ctaEnd: "אולי אחר כך",
    priceLabel: "מנוי חודשי",
    priceValue: "₪800",
    priceNote: "ללא עלות הקמה. מתחילים מיד.",
    included: [
      "אתר מותאם אישית",
      "מערכת CRM + תורים",
      "צ'אטבוט AI 24/7",
      "תחזוקה ותמיכה טכנית",
      "אחסון + דומיין",
    ],
  },
  buttons: { next: "הבא", prev: "הקודם", start: "התחל סיור", letsGo: "בוא נראה", skip: "דלג על הסיור" },
  tourButton: "סיור באתר",
};

const en: TourTranslations = {
  welcome: {
    title: "Welcome to your website 👋",
    description:
      "What you're about to see is a site built just for you. In one minute I'll walk you through everything: from what your clients see, to the management system that helps you run your business day to day.",
  },
  hero: {
    title: "Your client's first impression",
    description:
      "The very first thing every new client sees. Photos, colors and text are customized for your business. This is what gives you a professional digital presence.",
  },
  services: {
    title: "Your services, front and center",
    description:
      "Every service with name, price, description and image. The client sees exactly what you offer and books right away. Everything is editable in one click.",
  },
  booking: {
    title: "Appointments come in automatically",
    description:
      "The client picks a service, date and time, and confirms. The appointment goes straight into your system. No phone calls, no WhatsApp, no forgetting.",
  },
  whyChooseUs: {
    title: "Why you, specifically",
    description:
      "The section that convinces new clients. Showcases your unique strengths and builds trust before they even walk in.",
  },
  team: {
    title: "The team behind the business",
    description:
      "Every team member with their photo, bio and personal page. Clients love knowing who's taking care of them before they arrive.",
  },
  gallery: {
    title: "Your work speaks",
    description:
      "A photo gallery that shows your level. Visual proof that builds trust and brings new clients.",
  },
  testimonials: {
    title: "Your clients sell for you",
    description:
      "Real reviews that build trust. When a potential client sees others are happy, they book.",
  },
  contact: {
    title: "Direct line to clients",
    description:
      "Contact form that goes straight to your system. Client writes, you see it immediately. No message gets lost.",
  },
  businessHours: {
    title: "Clear business hours",
    description:
      "Clients always know when you're open. You change it from the system and the website updates on its own.",
  },
  location: {
    title: "Easy to find you",
    description:
      "Interactive map with your exact address. Clients get to you without calling to ask directions.",
  },
  ai: {
    title: "Smart assistant that works 24/7",
    description:
      "A chatbot that knows your business. Answers questions, recommends services and helps clients even while you sleep or you're with a client. AI that works for you.",
  },
  adminIntro: {
    title: "Now let me show you the real magic ✨",
    description:
      "Everything you've seen so far is what the client sees. Now I'll show you your management system. This is where you control everything.",
  },
  crmOverview: {
    title: "Everything at a glance",
    description:
      "How many appointments today, who's next, how much you've earned this month. No searching, no remembering. You open it and see everything.",
  },
  crmAppointments: {
    title: "Your appointments, organized",
    description:
      "Every appointment shows up here. You confirm, cancel or reschedule. Client walks in without a booking? Add them right from here.",
  },
  crmCustomers: {
    title: "All clients in one place",
    description:
      "Full history for every client: appointments, visits, preferences. You know your client better than any notebook.",
  },
  crmInbox: {
    title: "Messages straight from the website",
    description:
      "Every message a client sends through the site lands here. You read, reply and keep everything organized.",
  },
  crmStaff: {
    title: "Team management",
    description:
      "Each team member gets their own schedule, days off and working hours. The system prevents conflicts and organizes everything automatically.",
  },
  crmRules: {
    title: "Your rules, the system executes",
    description:
      "Minimum booking time, breaks between appointments, auto-confirmation. You set it once and the system follows your rules.",
  },
  closing: {
    title: "Everything is here, ready for you",
    description:
      "Professional website, booking system, customer management, AI, maintenance and full support. All included in one simple subscription.",
    ctaBuy: "I want to start",
    ctaEnd: "Maybe later",
    priceLabel: "Monthly subscription",
    priceValue: "₪800",
    priceNote: "No setup fee. Start right away.",
    included: [
      "Custom-designed website",
      "CRM + booking system",
      "AI chatbot 24/7",
      "Maintenance & tech support",
      "Hosting + domain",
    ],
  },
  buttons: { next: "Next", prev: "Previous", start: "Start Tour", letsGo: "Let's go", skip: "Skip the tour" },
  tourButton: "Site Tour",
};

const es: TourTranslations = {
  welcome: {
    title: "Bienvenido a tu sitio web 👋",
    description:
      "Lo que vas a ver es un sitio construido especialmente para vos. En un minuto te muestro todo: desde lo que ven tus clientes, hasta el sistema de gestión que te ayuda a manejar el negocio día a día.",
  },
  hero: {
    title: "La primera impresión de tu cliente",
    description:
      "Lo primero que ve cada cliente nuevo. Fotos, colores y textos personalizados para tu negocio. Esto es lo que te da presencia digital profesional.",
  },
  services: {
    title: "Tus servicios, en el centro",
    description:
      "Cada servicio con nombre, precio, descripción e imagen. El cliente ve exactamente lo que ofrecés y reserva directo. Todo editable en un click.",
  },
  booking: {
    title: "Los turnos llegan solos",
    description:
      "El cliente elige servicio, fecha y hora, y confirma. El turno entra directo a tu sistema. Sin llamadas, sin WhatsApp, sin olvidos.",
  },
  whyChooseUs: {
    title: "Por qué vos, específicamente",
    description:
      "La sección que convence a clientes nuevos. Muestra tus fortalezas únicas y genera confianza antes de que lleguen.",
  },
  team: {
    title: "El equipo detrás del negocio",
    description:
      "Cada miembro del equipo con foto, bio y página personal. A los clientes les encanta saber quién los va a atender antes de llegar.",
  },
  gallery: {
    title: "Tu trabajo habla",
    description:
      "Galería de fotos que muestra tu nivel. Prueba visual que genera confianza y trae clientes nuevos.",
  },
  testimonials: {
    title: "Tus clientes venden por vos",
    description:
      "Reseñas reales que generan confianza. Cuando un cliente potencial ve que otros están contentos, reserva.",
  },
  contact: {
    title: "Línea directa con clientes",
    description:
      "Formulario de contacto que llega directo a tu sistema. El cliente escribe, vos lo ves al instante. Ningún mensaje se pierde.",
  },
  businessHours: {
    title: "Horarios claros",
    description:
      "Los clientes siempre saben cuándo estás abierto. Vos cambiás desde el sistema y la web se actualiza sola.",
  },
  location: {
    title: "Que te encuentren fácil",
    description:
      "Mapa interactivo con tu dirección exacta. Los clientes llegan sin tener que llamar a preguntar.",
  },
  ai: {
    title: "Asistente inteligente que trabaja 24/7",
    description:
      "Un chatbot que conoce tu negocio. Responde preguntas, recomienda servicios y ayuda a tus clientes incluso mientras dormís o estás atendiendo. IA que trabaja para vos.",
  },
  adminIntro: {
    title: "Ahora te muestro la magia de verdad ✨",
    description:
      "Todo lo que viste hasta ahora es lo que ve el cliente. Ahora te muestro tu sistema de gestión. Desde acá controlás todo.",
  },
  crmOverview: {
    title: "Todo de un vistazo",
    description:
      "Cuántos turnos hay hoy, quién es el próximo, cuánto facturaste este mes. Sin buscar, sin recordar. Abrís y ves todo.",
  },
  crmAppointments: {
    title: "Tus turnos, organizados",
    description:
      "Cada turno aparece acá. Confirmás, cancelás o reprogramás. ¿Vino alguien sin turno? Lo agregás directo desde acá.",
  },
  crmCustomers: {
    title: "Todos los clientes en un lugar",
    description:
      "Historial completo de cada cliente: turnos, visitas, preferencias. Conocés a tu cliente mejor que cualquier libreta.",
  },
  crmInbox: {
    title: "Mensajes directo del sitio",
    description:
      "Cada mensaje que un cliente envía por el sitio llega acá. Leés, respondés y tenés todo organizado.",
  },
  crmStaff: {
    title: "Gestión del equipo",
    description:
      "Cada miembro tiene su propio horario, días libres y horas de trabajo. El sistema evita choques y organiza todo automáticamente.",
  },
  crmRules: {
    title: "Tus reglas, el sistema ejecuta",
    description:
      "Tiempo mínimo de reserva, pausas entre turnos, confirmación automática. Lo configurás una vez y el sistema sigue tus reglas.",
  },
  closing: {
    title: "Todo está acá, listo para vos",
    description:
      "Sitio profesional, sistema de turnos, gestión de clientes, IA, mantenimiento y soporte completo. Todo incluido en un solo plan simple.",
    ctaBuy: "Quiero empezar",
    ctaEnd: "Quizás después",
    priceLabel: "Suscripción mensual",
    priceValue: "₪800",
    priceNote: "Sin costo de instalación. Empezás de inmediato.",
    included: [
      "Sitio web personalizado",
      "CRM + sistema de turnos",
      "Chatbot IA 24/7",
      "Mantenimiento y soporte técnico",
      "Hosting + dominio",
    ],
  },
  buttons: { next: "Siguiente", prev: "Anterior", start: "Comenzar tour", letsGo: "Vamos", skip: "Saltar el tour" },
  tourButton: "Tour del sitio",
};

const ar: TourTranslations = {
  welcome: {
    title: "أهلاً بك في موقعك 👋",
    description:
      "ما ستراه الآن هو موقع مصمّم خصيصاً لك. خلال دقيقة واحدة سأعرض لك كل شيء: من واجهة العميل إلى لوحة الإدارة التي تساعدك على تشغيل عملك يومياً.",
  },
  hero: {
    title: "الانطباع الأول لعميلك",
    description:
      "أول ما يراه كل عميل جديد. الصور والألوان والنصوص مصمّمة لتناسب عملك وتمنحك حضوراً رقمياً احترافياً.",
  },
  services: {
    title: "خدماتك في الواجهة",
    description:
      "كل خدمة باسمها وسعرها ووصفها وصورتها. العميل يرى بالضبط ما تقدّمه ويحجز مباشرة. كل شيء قابل للتعديل بنقرة.",
  },
  booking: {
    title: "المواعيد تصلك تلقائياً",
    description:
      "العميل يختار الخدمة والتاريخ والوقت ويؤكد. الموعد يدخل مباشرة إلى نظامك. بدون مكالمات وبدون نسيان.",
  },
  whyChooseUs: {
    title: "لماذا أنت بالتحديد",
    description:
      "القسم الذي يُقنع العملاء الجدد. يعرض نقاط قوّتك الفريدة ويبني الثقة قبل أن يصلوا إليك.",
  },
  team: {
    title: "الفريق خلف العمل",
    description:
      "كل عضو بصورته ونبذته وصفحته الشخصية. العملاء يحبّون معرفة من سيتعامل معهم قبل الوصول.",
  },
  gallery: {
    title: "أعمالك تتحدث",
    description:
      "معرض صور يُظهر مستواك. إثبات بصري يبني الثقة ويجلب عملاء جدد.",
  },
  testimonials: {
    title: "عملاؤك يسوّقون لك",
    description:
      "تقييمات حقيقية تبني الثقة. عندما يرى العميل المحتمل أن الآخرين راضون، يحجز فوراً.",
  },
  contact: {
    title: "خطّ مباشر مع العملاء",
    description:
      "نموذج تواصل يصل مباشرة إلى نظامك. العميل يكتب وأنت تراه فوراً. لا رسالة تضيع.",
  },
  businessHours: {
    title: "ساعات عمل واضحة",
    description:
      "العملاء يعرفون دائماً متى أنت متاح. تغيّر من النظام والموقع يتحدّث وحده.",
  },
  location: {
    title: "سهل الوصول إليك",
    description:
      "خريطة تفاعلية بعنوانك الدقيق. العملاء يصلون بدون الحاجة للاتصال والسؤال.",
  },
  ai: {
    title: "مساعد ذكي يعمل ٢٤/٧",
    description:
      "روبوت دردشة يعرف عملك. يجيب على الأسئلة ويوصي بالخدمات ويساعد العملاء حتى وأنت نائم أو مشغول. ذكاء اصطناعي يعمل لصالحك.",
  },
  adminIntro: {
    title: "الآن دعني أريك السحر الحقيقي ✨",
    description:
      "كل ما شاهدته حتى الآن هو ما يراه العميل. الآن سأعرض لك لوحة الإدارة. من هنا تتحكّم بكل شيء.",
  },
  crmOverview: {
    title: "كل شيء بنظرة واحدة",
    description:
      "كم موعد اليوم، من العميل التالي، كم ربحت هذا الشهر. بدون بحث وبدون تذكّر. تفتح وترى كل شيء.",
  },
  crmAppointments: {
    title: "مواعيدك مرتّبة",
    description:
      "كل موعد يظهر هنا. تؤكد أو تلغي أو تعدّل. عميل جاء بدون موعد؟ تضيفه مباشرة من هنا.",
  },
  crmCustomers: {
    title: "كل العملاء في مكان واحد",
    description:
      "سجل كامل لكل عميل: مواعيد وزيارات وتفضيلات. تعرف عميلك أفضل من أي دفتر.",
  },
  crmInbox: {
    title: "رسائل مباشرة من الموقع",
    description:
      "كل رسالة يرسلها عميل عبر الموقع تصل إلى هنا. تقرأ وتردّ وتبقى كل شيء منظّم.",
  },
  crmStaff: {
    title: "إدارة الفريق",
    description:
      "كل عضو له جدوله وأيام إجازته وساعات عمله. النظام يمنع التضارب وينظّم كل شيء تلقائياً.",
  },
  crmRules: {
    title: "قواعدك والنظام ينفّذ",
    description:
      "حدّ أدنى للحجز، فترات راحة بين المواعيد، تأكيد تلقائي. تضبطها مرة والنظام يتّبع قواعدك.",
  },
  closing: {
    title: "كل شيء هنا وجاهز لك",
    description:
      "موقع احترافي، نظام مواعيد، إدارة عملاء، ذكاء اصطناعي، صيانة ودعم كامل. كل شيء في اشتراك واحد بسيط.",
    ctaBuy: "أريد أن أبدأ",
    ctaEnd: "ربما لاحقاً",
    priceLabel: "اشتراك شهري",
    priceValue: "₪800",
    priceNote: "بدون رسوم تأسيس. نبدأ فوراً.",
    included: [
      "موقع مصمّم خصيصاً",
      "نظام CRM + حجوزات",
      "روبوت دردشة ذكي ٢٤/٧",
      "صيانة ودعم تقني",
      "استضافة + نطاق",
    ],
  },
  buttons: { next: "التالي", prev: "السابق", start: "ابدأ الجولة", letsGo: "يلّا", skip: "تخطّي الجولة" },
  tourButton: "جولة في الموقع",
};

export const TOUR_TRANSLATIONS = { he, en, es, ar } as const;
export type TourLanguage = keyof typeof TOUR_TRANSLATIONS;
