/**
 * Páginas legales de peluquería en los 4 idiomas, cada una escrita en su idioma (R24), no traducida (Liam, 2026-10-09, revisión
 * de idiomas de la web de Evyatar: las tres páginas salían en inglés en todas las versiones, con el texto de un salón de uñas, el
 * nombre genérico del preset, huecos vacíos y una nota interna a la vista).
 *
 * Marcadores (los resuelve `getLegalDocument` en `legalContent.ts`): [NOMBRE] el responsable (razón social si la clienta la cargó,
 * si no el nombre de la marca), [MARCA] el nombre de la marca, [DIRECCION] la dirección en el idioma de la página, [TELEFONO],
 * [EMAIL] y [CANCELACION] (la política de `business.cancellationPolicy`). Un párrafo con un marcador vacío no se muestra: ninguna
 * frase queda con un hueco. Son una base razonable para un negocio en Israel; no reemplazan la revisión de un abogado.
 */
import type { LegalDocKind, LegalSection } from "./legalContent";
import type { UiLanguage } from "./uiLanguage";

export const LEGAL_PELUQUERIA: Record<UiLanguage, Record<LegalDocKind, LegalSection[]>> = {
  he: {
    privacy: [
      { paragraphs: [
        "האחראי על המידע האישי שנאסף באתר הוא [NOMBRE], שמפעיל את המספרה [MARCA].",
        "כתובת: [DIRECCION].",
        "מדיניות זו מסבירה איזה מידע אנחנו אוספים כשקובעים תור באתר, בוואטסאפ או בטלפון, ומה אנחנו עושים איתו.",
      ] },
      { title: "1. איזה מידע נאסף", paragraphs: [
        "שם, מספר טלפון וכתובת אימייל, אם מסרתם אותה.",
        "פרטי התור: השירות, התאריך, השעה והערות שבחרתם לכתוב, למשל על סוג השיער, טיפולים קודמים או רגישויות.",
        "תוכן ההודעות ששלחתם אלינו.",
        "מידע טכני מינימלי מהגלישה באתר (למשל כתובת IP וסוג הדפדפן), רק כשהוא נחוץ לאבטחה ולתפעול האתר.",
      ] },
      { title: "2. למה אנחנו משתמשים בו", paragraphs: [
        "כדי לקבוע תורים, לאשר אותם, לשנות אותם ולשלוח תזכורות.",
        "כדי לענות על שאלות ששלחתם.",
        "כדי לעמוד בחובות לפי דין, למשל רישום חשבונאי, ולשמור על אבטחת האתר.",
      ] },
      { title: "3. כמה זמן נשמר המידע", paragraphs: [
        "אנחנו שומרים את המידע כל עוד הוא נחוץ למטרות האלה ולפי מה שהחוק מחייב, ואחר כך מוחקים אותו.",
      ] },
      { title: "4. עם מי המידע משותף", paragraphs: [
        "עם ספקים שעוזרים לנו להפעיל את האתר ואת קביעת התורים: אחסון, שליחת הודעות ותשלום, אם קיים. הם מקבלים רק את מה שנחוץ לשירות.",
        "אנחנו לא מוכרים את המידע ולא מעבירים אותו לאחרים לצורכי פרסום.",
      ] },
      { title: "5. הזכויות שלכם", paragraphs: [
        "לפי חוק הגנת הפרטיות, התשמ״א-1981, אתם רשאים לעיין במידע שנשמר עליכם ולבקש לתקן או למחוק אותו.",
        "לבקשות: בטלפון או בוואטסאפ [TELEFONO].",
        "או באימייל: [EMAIL].",
        "אפשר גם לפנות לרשות להגנת הפרטיות.",
      ] },
    ],
    terms: [
      { paragraphs: [
        "התנאים האלה חלים על השימוש באתר של [MARCA] ועל קביעת תורים לשירותי שיער: תספורת, צבע, בליאז׳, החלקה וטיפולים.",
      ] },
      { title: "1. שימוש באתר", paragraphs: [
        "משתמשים באתר בתום לב ולפי החוק. אסור לשבש את פעולת האתר או את מערכת קביעת התורים.",
      ] },
      { title: "2. קביעת תור", paragraphs: [
        "תור שנקבע באתר הוא בקשה שמאושרת על המסך או בהודעה.",
        "המחירים והמשכים שבאתר הם לצורך התמצאות. המחיר הסופי הוא המחיר שבתוקף ביום הטיפול. בשירותים שמחירם נקבע אחרי ייעוץ, המחיר נקבע אחרי שרואים את השיער.",
      ] },
      { title: "3. דיוק ובריאות", paragraphs: [
        "כדאי להגיע בזמן. איחור משמעותי עלול לקצר את הטיפול או לחייב לקבוע מועד אחר.",
        "לפני צבע או החלקה חשוב לספר על אלרגיות, רגישויות וטיפולים כימיים קודמים. לפעמים צריך לעשות בדיקת רגישות מראש.",
      ] },
      { title: "4. תשלום", paragraphs: [
        "התשלום במספרה, בסוף התור, באמצעי התשלום הזמינים שם, אלא אם נאמר אחרת. אם יש תשלום באתר, חלים עליו גם תנאי ספק התשלום.",
      ] },
      { title: "5. אחריות", paragraphs: [
        "ככל שהחוק מתיר, האחריות שלנו על השימוש באתר מוגבלת לנזק ישיר שהוכח. איננו מתחייבים שהאתר יפעל תמיד ללא הפרעה.",
      ] },
    ],
    cancellation: [
      { paragraphs: [
        "ב-[MARCA] כל תור הוא זמן ששמור רק לכם. לכן חשוב לנו לדעת מראש אם צריך לבטל או לשנות.",
      ] },
      { title: "1. המדיניות", paragraphs: ["[CANCELACION]."] },
      { title: "2. איך מבטלים או משנים", paragraphs: [
        "בוואטסאפ או בטלפון: [TELEFONO].",
        "או באימייל: [EMAIL]. כתבו את השם ואת מועד התור.",
      ] },
      { title: "3. ביטול מאוחר ואי־הגעה", paragraphs: [
        "ביטול מאוחר או אי־הגעה עלולים לחייב כפי שכתוב במדיניות. אחרי כמה אי־הגעות ייתכן שנבקש מקדמה כדי לשריין את התור הבא.",
      ] },
    ],
  },
  en: {
    privacy: [
      { paragraphs: [
        "The person responsible for the personal data collected on this site is [NOMBRE], who runs the salon [MARCA].",
        "Address: [DIRECCION].",
        "This policy explains what we collect when you book online, on WhatsApp or by phone, and what we do with it.",
      ] },
      { title: "1. What we collect", paragraphs: [
        "Your name, phone number and email address, if you give it.",
        "Your appointment details: the service, date, time and any notes you choose to add, such as your hair type, previous treatments or sensitivities.",
        "The messages you send us.",
        "Minimal technical data from your visit (such as IP address and browser type), only where it is needed for security and to run the site.",
      ] },
      { title: "2. Why we use it", paragraphs: [
        "To book, confirm and change appointments and to send reminders.",
        "To answer your questions.",
        "To meet our legal obligations, such as bookkeeping, and to keep the site secure.",
      ] },
      { title: "3. How long we keep it", paragraphs: [
        "We keep your data for as long as these purposes and the law require, and then delete it.",
      ] },
      { title: "4. Who we share it with", paragraphs: [
        "Providers that help us run the site and the bookings: hosting, messaging and payments, where offered. They only receive what the service needs.",
        "We do not sell your data or pass it on to others for marketing.",
      ] },
      { title: "5. Your rights", paragraphs: [
        "Under the Israeli Protection of Privacy Law, 5741-1981, you may see the data we hold about you and ask us to correct or delete it.",
        "To make a request, call or message us on WhatsApp: [TELEFONO].",
        "Or email us: [EMAIL].",
        "You can also contact the Israeli Privacy Protection Authority.",
      ] },
    ],
    terms: [
      { paragraphs: [
        "These terms apply to the use of the [MARCA] website and to booking hair services: cuts, colour, balayage, straightening and treatments.",
      ] },
      { title: "1. Using the site", paragraphs: [
        "Please use the site lawfully and in good faith. Disrupting the site or the booking system is not allowed.",
      ] },
      { title: "2. Bookings", paragraphs: [
        "An online booking is a request, confirmed on screen or by message.",
        "Prices and durations on the site are a guide. You pay the price in force on the day of your appointment. For services quoted after a consultation, the price is set once we have seen your hair.",
      ] },
      { title: "3. Timing and health", paragraphs: [
        "Please arrive on time. If you are very late, the service may be shortened or moved to another time.",
        "Before colour or straightening, tell us about allergies, sensitivities and previous chemical treatments. A patch test may be needed first.",
      ] },
      { title: "4. Payment", paragraphs: [
        "You pay at the salon at the end of your appointment, by the payment methods available there, unless we tell you otherwise. If online payment is offered, the payment provider's terms also apply.",
      ] },
      { title: "5. Liability", paragraphs: [
        "To the extent the law allows, our liability for the use of the site is limited to proven direct damage. We cannot promise the site will always run without interruption.",
      ] },
    ],
    cancellation: [
      { paragraphs: [
        "At [MARCA], every appointment is time set aside just for you, so we need to know in advance if you have to cancel or change it.",
      ] },
      { title: "1. The policy", paragraphs: ["[CANCELACION]."] },
      { title: "2. How to cancel or change", paragraphs: [
        "On WhatsApp or by phone: [TELEFONO].",
        "Or by email: [EMAIL]. Please include your name and the date and time of your appointment.",
      ] },
      { title: "3. Late cancellations and no-shows", paragraphs: [
        "Late cancellations and no-shows may be charged as the policy says. After repeated no-shows we may ask for a deposit to hold your next appointment.",
      ] },
    ],
  },
  ru: {
    privacy: [
      { paragraphs: [
        "За персональные данные, которые собирает этот сайт, отвечает [NOMBRE], владелец салона [MARCA].",
        "Адрес: [DIRECCION].",
        "Здесь объясняется, какие данные мы получаем, когда вы записываетесь на сайте, в WhatsApp или по телефону, и что с ними делаем.",
      ] },
      { title: "1. Какие данные мы собираем", paragraphs: [
        "Имя, номер телефона и электронную почту, если вы её указали.",
        "Данные о записи: услуга, дата, время и заметки, которые вы решили оставить, например о типе волос, прежних процедурах или чувствительности.",
        "Сообщения, которые вы нам отправляете.",
        "Минимум технических данных о посещении сайта (например, IP-адрес и тип браузера), только когда они нужны для безопасности и работы сайта.",
      ] },
      { title: "2. Зачем они нужны", paragraphs: [
        "Чтобы записать вас, подтвердить или перенести запись и отправить напоминание.",
        "Чтобы ответить на ваши вопросы.",
        "Чтобы выполнять требования закона, например вести учёт, и защищать сайт.",
      ] },
      { title: "3. Сколько мы их храним", paragraphs: [
        "Столько, сколько нужно для этих целей и сколько требует закон. Потом данные удаляются.",
      ] },
      { title: "4. Кому мы их передаём", paragraphs: [
        "Только сервисам, которые помогают нам вести сайт и запись: хостинг, рассылка сообщений и оплата, если она есть. Они получают лишь то, что нужно для работы.",
        "Мы не продаём ваши данные и не передаём их другим для рекламы.",
      ] },
      { title: "5. Ваши права", paragraphs: [
        "По израильскому Закону о защите частной жизни 1981 года вы можете ознакомиться со своими данными и попросить исправить или удалить их.",
        "Для этого позвоните или напишите в WhatsApp: [TELEFONO].",
        "Или по электронной почте: [EMAIL].",
        "Вы также можете обратиться в Управление по защите частной жизни Израиля.",
      ] },
    ],
    terms: [
      { paragraphs: [
        "Эти условия действуют при пользовании сайтом [MARCA] и при записи на услуги для волос: стрижку, окрашивание, балаяж, выпрямление и уход.",
      ] },
      { title: "1. Пользование сайтом", paragraphs: [
        "Пользуйтесь сайтом добросовестно и в рамках закона. Мешать работе сайта или системы записи запрещено.",
      ] },
      { title: "2. Запись", paragraphs: [
        "Запись на сайте является заявкой, которую мы подтверждаем на экране или сообщением.",
        "Цены и длительность на сайте ориентировочные. Оплачивается цена, действующая в день визита. Если цена называется после консультации, мы определяем её, когда увидим волосы.",
      ] },
      { title: "3. Время и здоровье", paragraphs: [
        "Пожалуйста, приходите вовремя. При сильном опоздании процедуру могут сократить или перенести.",
        "Перед окрашиванием или выпрямлением расскажите об аллергии, чувствительности и прежних химических процедурах. Иногда сначала нужен тест на чувствительность.",
      ] },
      { title: "4. Оплата", paragraphs: [
        "Оплата производится в салоне, в конце визита, доступными там способами, если мы не договорились иначе. Если есть оплата на сайте, действуют и условия платёжного сервиса.",
      ] },
      { title: "5. Ответственность", paragraphs: [
        "В пределах, допустимых законом, наша ответственность за пользование сайтом ограничена доказанным прямым ущербом. Мы не можем гарантировать, что сайт всегда будет работать без перебоев.",
      ] },
    ],
    cancellation: [
      { paragraphs: [
        "В [MARCA] на каждую запись отводится время только для вас, поэтому нам важно заранее знать, если нужно отменить или перенести визит.",
      ] },
      { title: "1. Правила", paragraphs: ["[CANCELACION]."] },
      { title: "2. Как отменить или перенести", paragraphs: [
        "В WhatsApp или по телефону: [TELEFONO].",
        "Или по электронной почте: [EMAIL]. Укажите имя, дату и время записи.",
      ] },
      { title: "3. Поздняя отмена и неявка", paragraphs: [
        "За позднюю отмену или неявку может взиматься оплата, как указано в правилах. После нескольких неявок мы можем попросить предоплату за следующую запись.",
      ] },
    ],
  },
  ar: {
    privacy: [
      { paragraphs: [
        "المسؤول عن البيانات الشخصية التي يجمعها هذا الموقع هو [NOMBRE]، صاحب صالون [MARCA].",
        "العنوان: [DIRECCION].",
        "توضّح هذه السياسة ما نجمعه من بيانات عند حجز موعد عبر الموقع أو واتساب أو الهاتف، وكيف نستخدمها.",
      ] },
      { title: "1. البيانات التي نجمعها", paragraphs: [
        "الاسم ورقم الهاتف والبريد الإلكتروني إن أعطيتمونا إياه.",
        "تفاصيل الموعد: الخدمة والتاريخ والوقت وأي ملاحظات تختارون كتابتها، مثل نوع الشعر أو العلاجات السابقة أو الحساسية.",
        "الرسائل التي ترسلونها إلينا.",
        "حدّ أدنى من البيانات التقنية عن زيارة الموقع (مثل عنوان IP ونوع المتصفح)، فقط عندما تلزم لأمن الموقع وتشغيله.",
      ] },
      { title: "2. لماذا نستخدمها", paragraphs: [
        "لحجز المواعيد وتأكيدها وتغييرها وإرسال التذكيرات.",
        "للردّ على أسئلتكم.",
        "للوفاء بالتزاماتنا القانونية، مثل مسك الحسابات، وللحفاظ على أمن الموقع.",
      ] },
      { title: "3. مدّة الاحتفاظ بها", paragraphs: [
        "نحتفظ بالبيانات ما دامت لازمة لهذه الأغراض ووفقًا لما يفرضه القانون، ثم نحذفها.",
      ] },
      { title: "4. مع من نشاركها", paragraphs: [
        "مع مزوّدين يساعدوننا في تشغيل الموقع والحجز: الاستضافة وإرسال الرسائل والدفع إن وُجد. ولا يحصلون إلا على ما تحتاجه الخدمة.",
        "لا نبيع بياناتكم ولا ننقلها إلى غيرنا لأغراض الإعلان.",
      ] },
      { title: "5. حقوقكم", paragraphs: [
        "بموجب قانون حماية الخصوصية الإسرائيلي لسنة 1981، يحقّ لكم الاطّلاع على البيانات المحفوظة عنكم وطلب تصحيحها أو حذفها.",
        "لتقديم طلب: عبر الهاتف أو واتساب [TELEFONO].",
        "أو عبر البريد الإلكتروني: [EMAIL].",
        "ويمكنكم أيضًا التوجّه إلى سلطة حماية الخصوصية.",
      ] },
    ],
    terms: [
      { paragraphs: [
        "تسري هذه الشروط على استخدام موقع [MARCA] وعلى حجز خدمات الشعر: القصّ والصبغة والباليياج والفرد والعلاجات.",
      ] },
      { title: "1. استخدام الموقع", paragraphs: [
        "يُستخدم الموقع بحسن نيّة ووفق القانون. ويُمنع تعطيل الموقع أو نظام الحجز.",
      ] },
      { title: "2. الحجز", paragraphs: [
        "الحجز عبر الموقع طلبٌ يُؤكَّد على الشاشة أو برسالة.",
        "الأسعار والمدد في الموقع للاسترشاد. ويُدفع السعر الساري يوم الموعد. وفي الخدمات التي يُحدَّد سعرها بعد استشارة، نحدّده بعد رؤية الشعر.",
      ] },
      { title: "3. الالتزام بالموعد والصحة", paragraphs: [
        "نرجو الحضور في الموعد. التأخّر الكبير قد يقصّر الخدمة أو يستدعي موعدًا آخر.",
        "قبل الصبغة أو الفرد أخبرونا بأي حساسية أو علاجات كيميائية سابقة. وقد يلزم أحيانًا اختبار حساسية مسبق.",
      ] },
      { title: "4. الدفع", paragraphs: [
        "الدفع في الصالون في نهاية الموعد بوسائل الدفع المتاحة هناك، ما لم نتّفق على غير ذلك. وإذا توفّر الدفع عبر الموقع، تسري أيضًا شروط مزوّد الدفع.",
      ] },
      { title: "5. المسؤولية", paragraphs: [
        "في الحدود التي يسمح بها القانون، تقتصر مسؤوليتنا عن استخدام الموقع على الضرر المباشر المُثبَت. ولا نضمن أن يعمل الموقع دائمًا دون انقطاع.",
      ] },
    ],
    cancellation: [
      { paragraphs: [
        "في [MARCA] كل موعد هو وقت محجوز لكم وحدكم، لذلك يهمّنا أن نعرف مسبقًا إذا احتجتم إلى إلغائه أو تغييره.",
      ] },
      { title: "1. السياسة", paragraphs: ["[CANCELACION]."] },
      { title: "2. كيف تلغون أو تغيّرون الموعد", paragraphs: [
        "عبر واتساب أو الهاتف: [TELEFONO].",
        "أو عبر البريد الإلكتروني: [EMAIL]. اكتبوا الاسم وتاريخ الموعد ووقته.",
      ] },
      { title: "3. الإلغاء المتأخّر وعدم الحضور", paragraphs: [
        "قد يُحتسب مبلغ عند الإلغاء المتأخّر أو عدم الحضور كما تنصّ السياسة. وبعد تكرار عدم الحضور قد نطلب عربونًا لحجز الموعد التالي.",
      ] },
    ],
  },
};
