import type { NichePreset, WorkDay } from "../../types";
import { presetThemePeluqueria } from "./themes";

// Peluquería (BLOQUE-04): misma estructura, catálogo e imágenes que peluqueria.he.ts.

const IMG = "https://images.unsplash.com/photo-";
const q = "?auto=format&fit=crop&q=80&w=";

const WEEKDAY: WorkDay = { isOpen: true, hours: { start: "09:00", end: "20:00" }, breaks: [{ start: "14:00", end: "14:30", label: "Break" }] };
const FRIDAY: WorkDay = { isOpen: true, hours: { start: "08:00", end: "14:00" }, breaks: [] };
const CLOSED: WorkDay = { isOpen: false, hours: { start: "00:00", end: "00:00" }, breaks: [] };

export const peluqueriaPresetEn: NichePreset = {
  businessMode: "team",
  business: {
    type: "peluqueria",
    legalName: "Studio Noa Hair Ltd.",
    address: "24 Bialik St., Ramat Gan, 5245204, Israel",
    cancellationPolicy: "Free cancellation up to 24 hours before; late cancellation or no-show — 50% of the service price",
  },

  brand: {
    name: "Studio Noa",
    tagline: "Cuts, colour and blow-dry — Ramat Gan",
    description: "Women's hair salon in Ramat Gan: cuts, colour and balayage, blow-dry, straightening, event and bridal styling. Book online or send a photo on WhatsApp for a quote.",
    logoIconName: "Scissors",
    faviconEmoji: "💇‍♀️",
    ogImage: `${IMG}1600948836101-f9ffda59d250${q}1200`,
    aiPersona: "You are the virtual assistant of a women's hair salon in Ramat Gan. Answer warmly and briefly about services, durations and prices from the price list, and offer to book online or send a photo on WhatsApp for colour and straightening consultations.",
  },

  theme: presetThemePeluqueria,

  hero: {
    titlePrefix: "The salon",
    titleHighlight: "for your hair",
    titleSuffix: "Ramat Gan",
    eyebrow: "Women's hair salon",
    subtitle: "Cuts, colour, blow-dry and event styling. Book online or send a photo.",
    ctaPrimary: "Book now",
    ctaSecondary: "Ask on WhatsApp",
    backgroundImage: `${IMG}1600948836101-f9ffda59d250${q}2000`,
  },

  contact: {
    address: {
      street: "24 Bialik St.",
      district: "Ramat Gan centre",
      cityStateZip: "Ramat Gan, 5245204",
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
    { id: "cut", name: "Women's haircut", description: "Short consultation, wash, precise cut and dry. Every length, every texture.", duration: 60, price: 120, priceMax: 350, mode: "reserva" },
    { id: "cut-blowdry", name: "Haircut + blow-dry", description: "Full haircut finished with a styled blow-dry — you leave ready.", duration: 90, price: 150, priceMax: 450, mode: "reserva" },
    { id: "blowdry", name: "Blow-dry", description: "Wash and a smooth or wavy blow-dry. Price depends on hair length.", duration: 45, price: 50, priceMax: 160, mode: "reserva" },
    { id: "root-color", name: "Root colour", description: "Professional root touch-up, wash and dry included. Recommended every 4–6 weeks.", duration: 90, price: 130, priceMax: 300, mode: "reserva" },
    { id: "full-color", name: "Full head colour", description: "Even colour from root to tip, finished with a moisture treatment.", duration: 120, price: 180, priceMax: 600, mode: "reserva" },
    { id: "highlights", name: "Highlights / balayage", description: "Gradual lightening with natural transitions. Price depends on length, density and hair condition — send a photo and we'll quote.", duration: 180, price: 600, priceMax: 1500, mode: "consulta", popular: true },
    { id: "straightening", name: "Straightening (keratin / organic)", description: "Lasts 4–6 months. Time and price depend on length and hair condition — consultation required.", duration: 240, price: 600, priceMax: 2500, mode: "consulta" },
    { id: "treatment", name: "Hair treatment (moisture / repair)", description: "Deep treatment for dry, damaged or post-colour hair. Blow-dry included.", duration: 60, price: 580, priceMax: 1100, mode: "reserva" },
    { id: "event-style", name: "Event styling", description: "Updo, waves or sleek styling for an event. Come with hair washed the day before.", duration: 90, price: 250, priceMax: 800, mode: "reserva" },
    { id: "bride", name: "Bridal hair + trial", description: "Trial session plus styling on the wedding day. Price depends on the style and location — arranged by phone.", duration: 120, price: 800, priceMax: 2500, mode: "consulta" },
    { id: "kids-cut", name: "Kids' haircut", description: "Haircuts for children up to 12, patiently, in the quiet morning hours.", duration: 30, price: 86, priceMax: 216, mode: "reserva" },
    { id: "consult", name: "Consultation", description: "10–15 minutes to assess your hair and plan colour, straightening or a big change. Deducted from the treatment.", duration: 15, price: 0, priceMax: 250, mode: "reserva" },
  ],

  staff: [
    {
      id: "noa",
      slug: "noa-levi",
      name: "Noa Levi",
      photoUrl: `${IMG}1544717305-2782549b5136${q}800`,
      specialty: "Colour, balayage and lightening",
      bio: "Studio owner. 14 years in colour and lightening, with a focus on natural transitions and hair that stays healthy after colour.",
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
      name: "Maya Cohen",
      photoUrl: `${IMG}1531746020798-e6953c6e8e04${q}800`,
      specialty: "Haircuts and curly hair",
      bio: "Cuts by texture — curls above all. Dry-cuts when needed and teaches you how to keep the result at home.",
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
      name: "Dana Mizrahi",
      photoUrl: `${IMG}1508214751196-bcfd4ca60f91${q}800`,
      specialty: "Event and bridal styling",
      bio: "Styles that last until the end of the night. A trial for every bride, and on-location on the day.",
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
    { name: "Shira B.", title: "Google review", text: "I sent a photo on WhatsApp, Noa told me exactly what was possible and what wasn't, and the balayage came out just like the picture. My hair stayed soft after lightening.", rating: 5 },
    { name: "Neta K.", title: "Google review", text: "Finally someone who understands curls. Maya cut dry, explained what to do at home, and for the first time I left a salon without tying my hair up.", rating: 5 },
    { name: "Michal A.", title: "Google review", text: "Styling for my sister's wedding — a trial a week before, and on the day everything on time. It held until four in the morning.", rating: 5 },
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
      title: "What we do",
      subtitle: "Services & prices",
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
      title: "The team",
      subtitle: "Who takes care of you",
      description: "Each with her own speciality — colour, curls or events. Choose your stylist when booking.",
    },
    whyChooseUs: {
      title: "Why us",
      subtitle: "In short",
      mainImage: `${IMG}1521590832167-7bcbfaa6381f${q}1000`,
      badge: "Consult\nbefore colour",
      benefits: [
        { iconName: "MessageCircle", title: "Consult first, no surprises", desc: "Send a photo on WhatsApp and get a quote before you sit in the chair." },
        { iconName: "Palette", title: "Transparent prices", desc: "A price range for every service, and what's only set after a consultation." },
        { iconName: "Clock", title: "On time", desc: "Online booking, a reminder the day before, zero waiting at the door." },
        { iconName: "Sparkles", title: "Healthy hair first", desc: "Lightening and straightening only if your hair can take it." },
      ],
    },
    testimonials: {
      title: "Reviews",
      subtitle: "What they say about us",
    },
    gallery: {
      title: "From our chair",
      subtitle: "Our work",
    },
    location: {
      title: "Ramat Gan",
      subtitle: "Where we are",
    },
    contact: {
      title: "Contact",
      subtitle: "Book or ask",
      description: "Book online for fixed-price services; for complex colour, straightening or bridal — send a photo on WhatsApp and we'll come back with a quote.",
    },
    beforeAfter: {
      title: "Before & after",
      subtitle: "What we can do with your hair",
      cases: [
        { id: "balayage", title: "Natural balayage", description: "From uniform dark brown to gradual lightening without damaging the hair.", treatment: "Highlights / balayage", imageBefore: `${IMG}1524502397800-2eeaad7c3fe5${q}1200`, imageAfter: `${IMG}1492106087820-71f1a00d2b11${q}1200` },
        { id: "curls", title: "Curly cut", description: "Dry-cut by texture — volume in the right place.", treatment: "Women's haircut", imageBefore: `${IMG}1519699047748-de8e457a634e${q}1200`, imageAfter: `${IMG}1616683693504-3ea7e9ad6fec${q}1200` },
        { id: "event", title: "Event styling", description: "From everyday hair to an updo that lasts all night.", treatment: "Event styling", imageBefore: `${IMG}1531746020798-e6953c6e8e04${q}1200`, imageAfter: `${IMG}1560869713-7d0a29430803${q}1200` },
      ],
    },
    booking: {
      title: "Book an appointment",
      tagline: "Cuts, colour and blow-dry — Ramat Gan",
      steps: {
        service: "Service",
        staff: "Stylist",
        datetime: "Date & time",
        details: "Details",
        payment: "Payment",
      },
      aiConsultant: {
        title: "Not sure what to choose?",
        subtitle: "Quick advice",
        description: "Tell us about your hair and what you want, and we'll suggest the right service.",
        agentLabel: "Advice",
        placeholder: "e.g. long coloured hair, want to go lighter without damage...",
      },
      success: {
        title: "Booked",
        confirmed: "Appointment confirmed!",
        requestSaved: "Request saved!",
        cancelled: "Cancelled",
      },
    },
    instagram: {
      title: "Follow our work",
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
        title: "Team",
        scheduleTitle: "Weekly availability",
        commitButton: "Save schedule",
        enforcementTitle: "Availability enforcement",
        enforcementDesc: "Schedules are enforced in real time: availability changes or blocked days take effect immediately and prevent double bookings.",
      },
    },
    faq: {
      title: "FAQ",
      subtitle: "Before you book",
      items: [
        { question: "How long does each service take?", answer: "Haircut 45–60 min; blow-dry 30–45; root colour 60–90; full colour up to 2 h; highlights and balayage 2.5–3.5 h; straightening 3–5 h depending on length and condition; event styling 45–90 min." },
        { question: "How do I cancel or move an appointment?", answer: "Via the link in your confirmation, on WhatsApp or by phone — free up to 24 hours before. Late cancellation or no-show may be charged 50% of the service price." },
        { question: "How do I pay?", answer: "Cash, card or Bit at the salon. For straightening, full balayage and bridal styling we ask for a deposit when booking." },
        { question: "Why no final price for highlights and straightening?", answer: "Because it depends on length, density and hair condition (coloured? previously straightened?). Send a daylight photo of your hair on WhatsApp and we'll quote — or book a 10–15 minute consultation." },
        { question: "Do you cut children's hair?", answer: "Yes, up to age 12. Best in the morning hours, when the salon is quiet." },
        { question: "Is there someone who specialises in curls?", answer: "Yes — Maya. Pick her when booking and come with your hair as you wear it day to day." },
      ],
    },
  },
};
