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
  closing: TourStep & { ctaBuy: string; ctaEnd: string };
  buttons: { next: string; prev: string; start: string; letsGo: string; skip: string };
  tourButton: string;
}

const he: TourTranslations = {
  welcome: {
    title: "ברוכים הבאים",
    description:
      "זוהי הדגמה אינטראקטיבית של האתר העתידי שלך. הסיור ילווה אותך בכל הפיצ׳רים, מהאתר עצמו ועד לפאנל הניהול המלא. הסיור הזה הוא רק לתצוגה מקדימה ולא יופיע באתר הסופי.",
  },
  hero: {
    title: "זו הפנים של העסק שלך באינטרנט",
    description:
      "הקטע הראשון שהלקוחות שלך רואים. ניתן להתאמה אישית עם התמונות, הצבעים והטקסט שלך.",
  },
  services: {
    title: "השירותים שלך",
    description:
      "כל שירות ניתן לעריכה: שם, מחיר, תיאור ותמונה. הלקוחות שלך יראו בדיוק מה אתה מציע.",
  },
  booking: {
    title: "מערכת הזמנת התורים",
    description:
      "כך הלקוחות שלך קובעים תורים. בוחרים שירות, בוחרים תאריך ושעה, ומאשרים. כל הזמנה מגיעה ישירות לפאנל הניהול שלך.",
  },
  whyChooseUs: {
    title: "למה לבחור בך",
    description:
      "הקטע הזה מציג את היתרונות הייחודיים שלך. ניתן לערוך את הטקסט, האייקונים והתוכן.",
  },
  team: {
    title: "הצוות שלך",
    description:
      "הצג את חברי הצוות שלך עם תמונות, תיאורים ולינקים לפרופיל אישי. לכל אחד עמוד ייעודי.",
  },
  gallery: {
    title: "גלריית העבודות",
    description:
      "הצג את העבודות הטובות ביותר שלך. תמונות שמדברות בעד עצמן ובונות אמון עם לקוחות חדשים.",
  },
  testimonials: {
    title: "מה הלקוחות אומרים",
    description:
      "ביקורות ודירוגים של לקוחות מרוצים. הוכחה חברתית שבונה אמון ומגדילה המרות.",
  },
  contact: {
    title: "טופס יצירת קשר",
    description:
      "לקוחות שולחים הודעות ישירות מהאתר. כל הודעה מגיעה לתיבת הדואר שלך ולפאנל הניהול.",
  },
  businessHours: {
    title: "שעות פעילות",
    description:
      "הלקוחות יודעים מתי אתה פתוח. ניתן לעריכה מפאנל הניהול.",
  },
  location: {
    title: "המיקום שלך",
    description:
      "מפה אינטראקטיבית עם הכתובת שלך. הלקוחות מוצאים אותך בקלות.",
  },
  ai: {
    title: "בינה מלאכותית 24/7",
    description:
      "צ׳אטבוט חכם שמאומן עם המידע של העסק שלך. עונה על שאלות, ממליץ על שירותים ועוזר ללקוחות גם כשאתה לא זמין.",
  },
  adminIntro: {
    title: "עכשיו בוא נראה את מה שקורה מאחורי הקלעים",
    description:
      "פאנל הניהול שלך. מכאן אתה שולט על הכל: תורים, לקוחות, הודעות, סטטיסטיקות ועוד.",
  },
  crmOverview: {
    title: "סקירה כללית",
    description:
      "במבט אחד אתה רואה את כל מה שקורה היום: תורים, הכנסות, סטטוסים ועוד.",
  },
  crmAppointments: {
    title: "ניהול תורים",
    description:
      "כל התורים שנקבעו מופיעים כאן. אפשר לאשר, לבטל, לסנן לפי תאריך או איש צוות.",
  },
  crmCustomers: {
    title: "בסיס הלקוחות",
    description:
      "כל הלקוחות שלך במקום אחד. היסטוריית תורים, הערות, ואפשרות לייצוא.",
  },
  crmInbox: {
    title: "תיבת הודעות",
    description:
      "הודעות שלקוחות שולחים דרך טופס יצירת הקשר. אפשר לסנן, להגיב ולארכב.",
  },
  crmStaff: {
    title: "ניהול צוות",
    description:
      "הגדר לוחות זמנים, ימי חופש ושעות עבודה לכל חבר צוות.",
  },
  crmRules: {
    title: "הגדרות עסקיות",
    description:
      "כללי הזמנה: זמן מינימום מראש, אישור אוטומטי, הפסקות בין תורים ועוד.",
  },
  closing: {
    title: "הכל כלול בחבילה",
    description:
      "כל מה שראית כלול בתוכנית: אתר מותאם אישית, מערכת תורים, בינה מלאכותית, תחזוקה 24/7 ותמיכה מלאה.",
    ctaBuy: "רוצה את האתר הזה",
    ctaEnd: "סיים סיור",
  },
  buttons: { next: "הבא", prev: "הקודם", start: "התחל סיור", letsGo: "בוא נראה", skip: "כבר עשיתי את הסיור" },
  tourButton: "סיור באתר",
};

const en: TourTranslations = {
  welcome: {
    title: "Welcome",
    description:
      "This is an interactive demo of your future website. This tour will walk you through everything, from the site itself to the full management panel. This tour is only for this preview and won't appear on the final site.",
  },
  hero: {
    title: "This is the face of your business online",
    description:
      "The first thing your clients see. Fully customizable with your photos, colors, and text.",
  },
  services: {
    title: "Your services",
    description:
      "Each service is editable: name, price, description, and image. Your clients will see exactly what you offer.",
  },
  booking: {
    title: "Appointment booking system",
    description:
      "This is how your clients book appointments. They choose a service, pick a date and time, and confirm. Every booking goes straight to your admin panel.",
  },
  whyChooseUs: {
    title: "Why choose you",
    description:
      "This section highlights your unique selling points. The text, icons, and content are all editable.",
  },
  team: {
    title: "Your team",
    description:
      "Showcase your team members with photos, bios, and links to individual profile pages.",
  },
  gallery: {
    title: "Work gallery",
    description:
      "Show off your best work. Photos that speak for themselves and build trust with new clients.",
  },
  testimonials: {
    title: "What clients say",
    description:
      "Reviews and ratings from happy clients. Social proof that builds trust and increases conversions.",
  },
  contact: {
    title: "Contact form",
    description:
      "Clients send messages directly from the site. Every message arrives in your inbox and admin panel.",
  },
  businessHours: {
    title: "Business hours",
    description:
      "Clients know when you're open. Editable from the admin panel.",
  },
  location: {
    title: "Your location",
    description:
      "Interactive map with your address. Clients find you easily.",
  },
  ai: {
    title: "AI assistant, 24/7",
    description:
      "A smart chatbot trained with your business info. It answers questions, recommends services, and helps clients even when you're not available.",
  },
  adminIntro: {
    title: "Now let's see what happens behind the scenes",
    description:
      "Your management panel. From here you control everything: appointments, clients, messages, analytics, and more.",
  },
  crmOverview: {
    title: "Dashboard overview",
    description:
      "At a glance you see everything happening today: appointments, revenue, statuses, and more.",
  },
  crmAppointments: {
    title: "Appointment management",
    description:
      "Every booking shows up here. You can confirm, cancel, and filter by date or staff member.",
  },
  crmCustomers: {
    title: "Customer database",
    description:
      "All your clients in one place. Appointment history, notes, and export options.",
  },
  crmInbox: {
    title: "Message inbox",
    description:
      "Messages clients send through the contact form. Filter, reply, and archive.",
  },
  crmStaff: {
    title: "Staff management",
    description:
      "Set schedules, days off, and working hours for each team member.",
  },
  crmRules: {
    title: "Business settings",
    description:
      "Booking rules: minimum advance time, auto-confirm, breaks between appointments, and more.",
  },
  closing: {
    title: "Everything is included",
    description:
      "Everything you've seen is included in the plan: custom website, booking system, AI, 24/7 maintenance, and full support.",
    ctaBuy: "I want this website",
    ctaEnd: "End tour",
  },
  buttons: { next: "Next", prev: "Previous", start: "Start Tour", letsGo: "Let's go", skip: "I already took the tour" },
  tourButton: "Site Tour",
};

const es: TourTranslations = {
  welcome: {
    title: "Bienvenido",
    description:
      "Esta es una demo interactiva de tu futura web. Este tour te guiará por todo, desde el sitio hasta el panel de gestión completo. Este tour es solo para esta preview y no aparecerá en el sitio final.",
  },
  hero: {
    title: "Esta es la cara de tu negocio en internet",
    description:
      "Lo primero que ven tus clientes. Totalmente personalizable con tus fotos, colores y texto.",
  },
  services: {
    title: "Tus servicios",
    description:
      "Cada servicio es editable: nombre, precio, descripción e imagen. Tus clientes verán exactamente lo que ofrecés.",
  },
  booking: {
    title: "Sistema de reserva de turnos",
    description:
      "Así reservan tus clientes. Eligen servicio, fecha y hora, y confirman. Cada reserva llega directo a tu panel de admin.",
  },
  whyChooseUs: {
    title: "Por qué elegirte",
    description:
      "Esta sección muestra tus ventajas únicas. El texto, los íconos y el contenido son editables.",
  },
  team: {
    title: "Tu equipo",
    description:
      "Mostrá a los miembros de tu equipo con fotos, biografías y links a sus perfiles individuales.",
  },
  gallery: {
    title: "Galería de trabajos",
    description:
      "Mostrá tus mejores trabajos. Fotos que hablan por sí solas y generan confianza con nuevos clientes.",
  },
  testimonials: {
    title: "Lo que dicen los clientes",
    description:
      "Reseñas y calificaciones de clientes satisfechos. Prueba social que genera confianza y aumenta conversiones.",
  },
  contact: {
    title: "Formulario de contacto",
    description:
      "Los clientes envían mensajes directamente desde el sitio. Cada mensaje llega a tu bandeja y al panel de admin.",
  },
  businessHours: {
    title: "Horarios de atención",
    description:
      "Los clientes saben cuándo estás abierto. Editable desde el panel de admin.",
  },
  location: {
    title: "Tu ubicación",
    description:
      "Mapa interactivo con tu dirección. Los clientes te encuentran fácil.",
  },
  ai: {
    title: "Asistente IA, 24/7",
    description:
      "Un chatbot inteligente entrenado con la info de tu negocio. Responde preguntas, recomienda servicios y ayuda a tus clientes incluso cuando no estás disponible.",
  },
  adminIntro: {
    title: "Ahora veamos lo que pasa detrás de escena",
    description:
      "Tu panel de gestión. Desde acá controlás todo: turnos, clientes, mensajes, estadísticas y más.",
  },
  crmOverview: {
    title: "Vista general",
    description:
      "De un vistazo ves todo lo que pasa hoy: turnos, ingresos, estados y más.",
  },
  crmAppointments: {
    title: "Gestión de turnos",
    description:
      "Cada reserva aparece acá. Podés confirmar, cancelar y filtrar por fecha o miembro del equipo.",
  },
  crmCustomers: {
    title: "Base de clientes",
    description:
      "Todos tus clientes en un solo lugar. Historial de turnos, notas y opciones de exportación.",
  },
  crmInbox: {
    title: "Bandeja de mensajes",
    description:
      "Mensajes que los clientes envían por el formulario de contacto. Filtrá, respondé y archivá.",
  },
  crmStaff: {
    title: "Gestión de equipo",
    description:
      "Configurá horarios, días libres y horas de trabajo para cada miembro del equipo.",
  },
  crmRules: {
    title: "Configuración del negocio",
    description:
      "Reglas de reserva: tiempo mínimo de anticipación, confirmación automática, pausas entre turnos y más.",
  },
  closing: {
    title: "Todo está incluido",
    description:
      "Todo lo que viste está incluido en el plan: sitio personalizado, sistema de turnos, IA, mantenimiento 24/7 y soporte completo.",
    ctaBuy: "Quiero este sitio",
    ctaEnd: "Terminar tour",
  },
  buttons: { next: "Siguiente", prev: "Anterior", start: "Comenzar tour", letsGo: "Vamos", skip: "Ya hice el tour" },
  tourButton: "Tour del sitio",
};

export const TOUR_TRANSLATIONS = { he, en, es } as const;
export type TourLanguage = keyof typeof TOUR_TRANSLATIONS;
