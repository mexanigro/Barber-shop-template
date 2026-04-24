import type { BusinessNiche, SiteConfig } from "../types";

export type LegalDocKind = "privacy" | "terms" | "cancellation";

export type LegalSection = {
  title?: string;
  paragraphs: string[];
};

/**
 * Rutas públicas en español (aliases en inglés gestionados en App).
 */
export const LEGAL_ROUTES = {
  privacy: "/privacidad",
  terms: "/terminos",
  cancellation: "/cancelacion",
} as const;

/** Reemplaza marcadores estáticos por valores de `siteConfig`. */
export function interpolateLegalText(raw: string, site: SiteConfig): string {
  return raw
    .replaceAll("[NOMBRE_EMPRESA]", site.business.legalName)
    .replaceAll("[NOMBRE_COMERCIAL]", site.brand.name)
    .replaceAll("[DIRECCION]", site.business.address)
    .replaceAll("[TIEMPO_CANCELACION]", site.business.cancellationPolicy)
    .replaceAll("[EMAIL]", site.contact.email)
    .replaceAll("[TELEFONO]", site.contact.phone);
}

function interpolateSections(sections: LegalSection[], site: SiteConfig): LegalSection[] {
  return sections.map((s) => ({
    ...s,
    paragraphs: s.paragraphs.map((p) => interpolateLegalText(p, site)),
  }));
}

const NICHE_FALLBACK: BusinessNiche = "barberia";

type Library = Record<BusinessNiche, Record<LegalDocKind, LegalSection[]>>;

const LIBRARY: Library = {
  barberia: {
    privacy: [
      {
        paragraphs: [
          "The data controller responsible for processing your personal data is [NOMBRE_EMPRESA], with registered address at [DIRECCION]. For the purposes of this Policy, the trade name under which it operates publicly is [NOMBRE_COMERCIAL].",
          "This policy describes how we collect and process the personal data you provide through our website, contact forms, online booking systems, and communications related to barbershop appointments.",
        ],
      },
      {
        title: "1. Data We May Collect",
        paragraphs: [
          "Identification and contact information (full name, phone number, email address).",
          "Appointment-related data (date, time, selected professional, requested service, and any optional notes you provide).",
          "Appointment history managed through our digital tools.",
          "Message content when you use inquiry forms or the help chat.",
          "Minimal technical data arising from your browsing session (e.g., IP address, browser type, and pages visited) where necessary for security or the legitimate operation of the site.",
        ],
      },
      {
        title: "2. Purposes and Legal Basis",
        paragraphs: [
          "Managing bookings, confirmations, reschedules, and operational communications related to your appointment.",
          "Responding to information requests submitted via form or email.",
          "Sending appointment reminders where you have provided consent or where there is a legitimate interest in reducing no-shows, always in compliance with applicable communications regulations.",
          "Fulfilling applicable legal obligations relating to accounting, tax, or data protection where required.",
          "Improving site security and preventing fraudulent use of the booking system.",
        ],
      },
      {
        title: "3. Retention",
        paragraphs: [
          "We will retain your data for as long as necessary to fulfill the purposes above and comply with applicable legal obligations. Data associated with appointments may be retained in a format that enables documentation of the contractual relationship or defense against claims, in accordance with generally applicable retention periods.",
        ],
      },
      {
        title: "4. Recipients and Data Processors",
        paragraphs: [
          "We may engage providers that supply web hosting, transactional email delivery, payment processing (if enabled), or other booking management tools, formalizing the obligations required by applicable law with any party that accesses data on our behalf.",
          "We do not sell client lists or transfer your data to third parties for their own independent marketing purposes.",
        ],
      },
      {
        title: "5. Your Rights",
        paragraphs: [
          "You may request access, rectification, erasure, restriction of processing, portability, or objection as applicable, by contacting [EMAIL] and providing reasonable identification. You also have the right to lodge a complaint with the competent data protection authority.",
        ],
      },
    ],
    terms: [
      {
        paragraphs: [
          "These Terms govern access to and use of the website operated by [NOMBRE_EMPRESA] ([NOMBRE_COMERCIAL]) and the booking of barbershop and male grooming services.",
        ],
      },
      {
        title: "1. Use of the Site",
        paragraphs: [
          "Users agree to use the site in accordance with applicable law and in good faith. Fraudulent activity, introduction of malware, or automated overloading of the booking system is strictly prohibited.",
        ],
      },
      {
        title: "2. Bookings",
        paragraphs: [
          "An online reservation constitutes a firm request unless otherwise stated. Confirmation may be displayed on screen and/or delivered by email depending on the system configuration.",
          "Published prices, durations, and availability are indicative. The final amount charged will be the rate in effect at the time of service, unless an expressly binding promotion applies.",
        ],
      },
      {
        title: "3. Punctuality & Conduct",
        paragraphs: [
          "We recommend arriving a few minutes early. Significant lateness may result in a reduced service or rescheduling to avoid disruption to other clients.",
          "We reserve the right to refuse service if there is a risk to the safety of our staff or other clients, or in the event of a clear breach of reasonable hygiene standards.",
        ],
      },
      {
        title: "4. Payments",
        paragraphs: [
          "Where online payments are offered, the terms of the applicable payment gateway will apply. In the case of deposits or partial payments, the specific conditions will be communicated prior to confirming the transaction.",
        ],
      },
      {
        title: "5. Limitation of Liability",
        paragraphs: [
          "Unless required otherwise by law, our liability for use of the site is limited to the extent permitted to direct, proven damages. We do not warrant uninterrupted availability of the online service.",
          "Allergic reactions or skin sensitivities must be disclosed to the professional prior to the service. [NOMBRE_COMERCIAL] accepts no liability for circumstances not reasonably communicated in advance.",
        ],
      },
    ],
    cancellation: [
      {
        paragraphs: [
          "[NOMBRE_COMERCIAL], operated by [NOMBRE_EMPRESA], maintains a cancellation and rescheduling policy consistent with the salon's scheduling requirements and respect for other clients' time.",
        ],
      },
      {
        title: "1. Minimum Notice Period",
        paragraphs: [
          "To cancel or reschedule an appointment without incurring a late-cancellation penalty, clients must notify us at least: [TIEMPO_CANCELACION].",
          "This notice period is calculated from the scheduled start time of the confirmed booking.",
        ],
      },
      {
        title: "2. Late Cancellations & No-Shows",
        paragraphs: [
          "Cancellations received outside the notice window above may be treated as late cancellations. Depending on internal policy, prepayment or booking restrictions may be applied for future reservations.",
          "Unjustified no-shows may result in restrictions on future online bookings or a deposit requirement to secure the next appointment.",
        ],
      },
      {
        title: "3. How to Cancel",
        paragraphs: [
          "You may cancel via the management links included in your booking confirmation (where available), by replying to the confirmation email, or by calling [TELEFONO].",
          "Email communications should be sent to [EMAIL], including your name, appointment date, and appointment time.",
        ],
      },
    ],
  },

  estetica: {
    privacy: [
      {
        paragraphs: [
          "El responsable del tratamiento es [NOMBRE_EMPRESA], domicilio en [DIRECCION]. Esta política complementa la información que el centro estético [NOMBRE_COMERCIAL] facilita sobre el tratamiento de datos personales obtenidos por la web y la agenda digital.",
        ],
      },
      {
        title: "1. Datos tratados",
        paragraphs: [
          "Identificación y contacto; datos de citas y tratamientos solicitados (sin incluir categorías especialmente protegidas salvo que usted los facilite voluntariamente en formularios).",
          "Información opcional sobre alergias o contraindicaciones cuando sea necesaria para la seguridad del tratamiento estético.",
          "Historial operativo de reservas y comunicaciones relacionadas con su visita.",
        ],
      },
      {
        title: "2. Finalidades",
        paragraphs: [
          "Organización de agenda, confirmaciones y recordatorios cuando proceda.",
          "Responder consultas previas y gestionar consentimientos informados cuando la actividad lo exija.",
          "Cumplimiento normativo y reclamaciones.",
          "Mejora del servicio y seguridad del canal digital.",
        ],
      },
      {
        title: "3. Conservación y comunicaciones",
        paragraphs: [
          "Los datos se conservarán durante los plazos necesarios para cada finalidad y obligación legal.",
          "Podremos comunicar datos a proveedores tecnológicos sujetos a contrato de tratamiento que participen en el funcionamiento del sitio o la agenda.",
        ],
      },
      {
        title: "4. Derechos",
        paragraphs: [
          "Puede ejercer los derechos reconocidos en la normativa aplicable escribiendo a [EMAIL], identificándose de forma razonable.",
        ],
      },
    ],
    terms: [
      {
        paragraphs: [
          "Al utilizar el sitio y reservar tratamientos en [NOMBRE_COMERCIAL] usted acepta estos Términos en nombre de [NOMBRE_EMPRESA].",
        ],
      },
      {
        title: "1. Servicios",
        paragraphs: [
          "Los tratamientos y duraciones publicadas son descriptivas; el profesional podrá adaptar la sesión según valoración previa y protocolos de seguridad.",
        ],
      },
      {
        title: "2. Reservas y contraindicaciones",
        paragraphs: [
          "El usuario declara informar de contraindicaciones médicas relevantes cuando el tipo de tratamiento lo requiera.",
          "La empresa podrá rechazar el servicio si existiera riesgo manifiesto para la salud del cliente o del personal.",
        ],
      },
      {
        title: "3. Productos y pagos",
        paragraphs: [
          "Los precios pueden actualizarse; el importe aplicable será el comunicado al confirmar la cita o en recepción según corresponda.",
        ],
      },
      {
        title: "4. Responsabilidad",
        paragraphs: [
          "La responsabilidad del centro frente al uso del sitio web se delimita conforme a la ley aplicable. Los resultados estéticos pueden variar según características individuales.",
        ],
      },
    ],
    cancellation: [
      {
        paragraphs: [
          "Política de cancelación y reprogramación de citas para servicios estéticos prestados por [NOMBRE_COMERCIAL] ([NOMBRE_EMPRESA]).",
        ],
      },
      {
        title: "1. Antelación mínima",
        paragraphs: [
          "Las cancelaciones o cambios de fecha/h deben solicitarse con al menos: [TIEMPO_CANCELACION] antes del inicio programado de la sesión.",
        ],
      },
      {
        title: "2. Efectos del incumplimiento",
        paragraphs: [
          "Las cancelaciones fuera de plazo y las ausencias pueden dar lugar a cargos parciales o políticas de depósito para futuras reservas, según lo comunicado en recepción o en la confirmación electrónica.",
        ],
      },
      {
        title: "3. Canales",
        paragraphs: [
          "Gestión online cuando esté disponible, o bien [TELEFONO] / [EMAIL] con los datos de la reserva.",
        ],
      },
    ],
  },

  abogado: {
    privacy: [
      {
        paragraphs: [
          "En cumplimiento del principio de transparencia, [NOMBRE_EMPRESA] (en adelante, el «Despacho»), con domicilio en [DIRECCION], informa sobre el tratamiento de datos personales obtenidos a través del presente sitio web y formularios de contacto del despacho [NOMBRE_COMERCIAL].",
        ],
      },
      {
        title: "1. Datos recabados",
        paragraphs: [
          "Identificación y datos de contacto profesionales que usted voluntariamente ingrese en formularios de consulta.",
          "Contenido de la consulta inicial (descripción genérica del asunto), sin que el mero envío del formulario establezca relación de asistencia jurídica sin contrato expreso.",
          "Datos técnicos básicos de conexión cuando resulten necesarios por seguridad.",
        ],
      },
      {
        title: "2. Finalidades",
        paragraphs: [
          "Valorar la viabilidad de una posible relación profesional y responder a solicitudes de información previa.",
          "Gestionar citas o videollamadas de primera entrevista cuando exista ese módulo.",
          "Cumplimiento de obligaciones legales aplicables al ejercicio de la profesión y prevención de blanqueo cuando corresponda conforme a normativa vigente.",
          "La base jurídica será la ejecución de medidas precontractuales, el consentimiento del interesado o el interés legítimo del Despacho en la gestión segura del canal, según cada tratamiento.",
        ],
      },
      {
        title: "3. Secreto profesional y destinatarios",
        paragraphs: [
          "Los datos se tratarán con confidencialidad conforme a las reglas del ejercicio de la abogacía. Solo tendrán acceso personal autorizado y encargados del tratamiento estrictamente necesarios (por ejemplo hosting o correo profesional), con las garantías contractuales adecuadas.",
        ],
      },
      {
        title: "4. Plazos y derechos",
        paragraphs: [
          "Los datos se conservarán durante el tiempo necesario para atender la consulta y, en su caso, la relación profesional y los plazos legales de conservación documental.",
          "Puede ejercer derechos de acceso, rectificación, supresión, limitación, portabilidad y oposición escribiendo a [EMAIL].",
        ],
      },
    ],
    terms: [
      {
        paragraphs: [
          "Los presentes Términos regulan el uso del sitio web de [NOMBRE_EMPRESA] y la información general publicada bajo la marca [NOMBRE_COMERCIAL]. No sustituyen el contrato de prestación de servicios jurídicos, que se formalizará por separado cuando proceda.",
        ],
      },
      {
        title: "1. Naturaleza informativa",
        paragraphs: [
          "Los contenidos del sitio tienen carácter general y no constituyen asesoramiento jurídico específico. Cada caso requiere análisis individualizado.",
        ],
      },
      {
        title: "2. Contacto y representación",
        paragraphs: [
          "El envío de formularios no crea por sí solo relación abogado-cliente hasta que el Despacho confirme por escrito la aceptación del encargo conforme a sus políticas internas y normativa aplicable.",
        ],
      },
      {
        title: "3. Honorarios",
        paragraphs: [
          "Las tarifas y modalidades de facturación serán las acordadas expresamente en propuesta o contrato de honorarios.",
        ],
      },
      {
        title: "4. Limitación de responsabilidad",
        paragraphs: [
          "Salvo disposición legal imperativa en contrario, el Despacho no será responsable de decisiones tomadas únicamente con base en información genérica del sitio sin contrato de asistencia.",
        ],
      },
    ],
    cancellation: [
      {
        paragraphs: [
          "Normas sobre cancelación o reprogramación de reuniones previas concertadas con [NOMBRE_COMERCIAL], titularidad de [NOMBRE_EMPRESA].",
        ],
      },
      {
        title: "1. Preaviso",
        paragraphs: [
          "Las cancelaciones o cambios de horario de reuniones agendadas deberán comunicarse con una antelación mínima de [TIEMPO_CANCELACION], salvo fuerza mayor debidamente acreditada.",
        ],
      },
      {
        title: "2. Consecuencias",
        paragraphs: [
          "El incumplimiento reiterado del preaviso podrá condicionar la aceptación de nuevas solicitudes de cita o el cobro de tiempo reservado, según lo acordado en cada caso.",
        ],
      },
      {
        title: "3. Comunicación",
        paragraphs: [
          "Las cancelaciones pueden notificarse a [EMAIL] o al teléfono [TELEFONO], identificando la fecha y hora originales de la reunión.",
        ],
      },
    ],
  },
};

function pickNiche(type: BusinessNiche): BusinessNiche {
  if (type in LIBRARY) return type;
  return NICHE_FALLBACK;
}

/** Secciones legales interpoladas listas para renderizar. */
export function getLegalDocument(kind: LegalDocKind, site: SiteConfig): LegalSection[] {
  const niche = pickNiche(site.business.type);
  const sections = LIBRARY[niche][kind];
  return interpolateSections(sections, site);
}
