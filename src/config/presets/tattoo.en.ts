import type { NichePreset } from "../../types";
import { presetThemeTattoo } from "./themes";

export const tattooPresetEn: NichePreset = {
  // ─── Business & Legal ────────────────────────────────────────────────────────
  business: {
    type: "tattoo",
    legalName: "MASTERPIECE INK STUDIO LLC",
    address:
      "87 Inkwell Avenue, Arts District, Los Angeles, CA 90012, United States",
    cancellationPolicy: "48 hours prior to the scheduled appointment start time",
  },

  // ─── Brand ───────────────────────────────────────────────────────────────────
  brand: {
    name: "MASTERPIECE INK",
    tagline: "Where Skin Becomes Art",
    description:
      "An elite tattoo studio where master artists transform your vision into a permanent masterpiece. Custom designs, fine line work, and immersive consultations — every piece is one of a kind.",
    logoIconName: "Pen",
    aiPersona:
      "You are a virtual specialist at Masterpiece Ink, a high-end tattoo studio. Your mission is to guide clients with confidence and expertise — answer questions about our services, help them prepare for their session, explain aftercare, and recommend the right artist for their vision. Be warm, knowledgeable, and artistically inclined.",
  },

  theme: presetThemeTattoo,

  // ─── Hero ─────────────────────────────────────────────────────────────────────
  hero: {
    titlePrefix: "YOUR SKIN,",
    titleHighlight: "OUR CANVAS",
    titleSuffix: "PERMANENT ART FOR THE BOLD",
    subtitle:
      "Every piece begins with a free in-person consultation — no commitment, no deposit. Meet your artist, define the vision, then book your session. Custom art executed with surgical precision.",
    ctaPrimary: "BOOK FREE CONSULT",
    ctaSecondary: "VIEW PORTFOLIO",
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
      name: "Free Consultation",
      description:
        "Start here — no charge, no commitment. Meet your artist in person for a 30–60 min session to review portfolio work, discuss your concept, choose placement and style, and map out the full project before a single deposit is made.",
      duration: 60,
      price: 0,
    },
    {
      id: "custom-design",
      name: "Custom Design",
      description:
        "Fully original artwork conceived around your vision. Billed at $180/hr — most custom pieces run 1–4 sessions depending on size and complexity. Every piece starts with the free consultation and includes sketch approval before your session.",
      duration: 180,
      price: 180,
    },
    {
      id: "fine-line",
      name: "Fine Line & Minimalism",
      description:
        "Single-needle precision for ultra-delicate linework, micro-realism, and minimalist compositions. Billed at $150/hr. Smaller minimalist designs under 2 inches may be quoted at a flat rate — confirm during your free consultation.",
      duration: 120,
      price: 150,
    },
    {
      id: "black-grey-realism",
      name: "Black & Grey Realism",
      description:
        "Hyper-realistic portraiture and cinematic imagery in black & grey. Billed at $200/hr — large-scale realism is spread across multiple sessions for optimal ink saturation and healing. Requires a free consultation.",
      duration: 240,
      price: 200,
    },
    {
      id: "cover-up",
      name: "Cover-Up & Rework",
      description:
        "Transform unwanted ink into original art. Requires a mandatory free consultation to assess coverage needs. Billed at $160/hr — most cover-ups take 2–3 sessions. A $100 design deposit is held after consultation and applied to your final bill.",
      duration: 180,
      price: 160,
    },
    {
      id: "flash-small",
      name: "Flash & Small Pieces",
      description:
        "Pre-drawn flash designs and small original pieces under 3 inches. Flat studio minimum starting at $120 — what you see is what you pay, no hourly billing. Perfect for first-timers or adding to an existing collection without a consultation.",
      duration: 60,
      price: 120,
    },
    {
      id: "piercing",
      name: "Precision Piercing",
      description:
        "Professional piercing using implant-grade titanium and surgical steel. From classic lobes to high-cartilage and surface anchors — flat rate, same-day service, full aftercare kit included.",
      duration: 30,
      price: 80,
    },
  ],

  // ─── Staff ───────────────────────────────────────────────────────────────────
  staff: [
    {
      id: "izzy",
      slug: "izzy-cross",
      name: "Izzy Cross",
      // Portrait: edgy female tattoo artist, studio environment, professional
      photoUrl:
        "https://images.unsplash.com/photo-1677286061466-7cc3531e5027?auto=format&fit=crop&q=80&w=800",
      specialty: "Fine Line & Botanical Illustration",
      bio: "Izzy spent five years as a botanical illustrator before discovering tattooing. Her delicate single-needle line work brings an organic, almost watercolor sensibility to the skin. Specializing in flora, fauna, and abstract minimalism, her pieces feel like they were always part of the body.",
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
        tuesday: { isOpen: true, hours: { start: "11:00", end: "19:00" }, breaks: [{ start: "14:00", end: "15:00", label: "Lunch" }] },
        wednesday: { isOpen: true, hours: { start: "11:00", end: "19:00" }, breaks: [{ start: "14:00", end: "15:00", label: "Lunch" }] },
        thursday: { isOpen: true, hours: { start: "11:00", end: "19:00" }, breaks: [{ start: "14:00", end: "15:00", label: "Lunch" }] },
        friday: { isOpen: true, hours: { start: "11:00", end: "20:00" }, breaks: [{ start: "15:00", end: "16:00", label: "Break" }] },
        saturday: { isOpen: true, hours: { start: "10:00", end: "18:00" }, breaks: [] },
        sunday: { isOpen: false, hours: { start: "00:00", end: "00:00" }, breaks: [] },
      },
    },
    {
      id: "marco",
      slug: "marco-veil",
      name: "Marco Veil",
      // Portrait: male tattoo artist, tattooed arms, professional studio setting
      photoUrl:
        "https://images.unsplash.com/photo-1746703509843-af889aa20300?auto=format&fit=crop&q=80&w=800",
      specialty: "Black & Grey Realism",
      bio: "Marco is widely regarded as one of the West Coast's foremost black-and-grey realism artists. With over 14 years of experience, his hyper-detailed portraiture and cinematic compositions have been featured in international tattoo publications. Every piece Marco creates is a study in light, shadow, and permanence.",
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
        wednesday: { isOpen: true, hours: { start: "12:00", end: "20:00" }, breaks: [{ start: "16:00", end: "17:00", label: "Break" }] },
        thursday: { isOpen: true, hours: { start: "12:00", end: "20:00" }, breaks: [{ start: "16:00", end: "17:00", label: "Break" }] },
        friday: { isOpen: true, hours: { start: "11:00", end: "21:00" }, breaks: [{ start: "15:00", end: "16:00", label: "Lunch" }] },
        saturday: { isOpen: true, hours: { start: "10:00", end: "21:00" }, breaks: [{ start: "14:00", end: "15:00", label: "Lunch" }] },
        sunday: { isOpen: true, hours: { start: "12:00", end: "18:00" }, breaks: [] },
      },
    },
    {
      id: "devon",
      slug: "devon-ash",
      name: "Devon Ash",
      // Portrait: non-binary/androgynous artist, creative professional look
      photoUrl:
        "https://images.unsplash.com/photo-1659693707379-f7b696d92011?auto=format&fit=crop&q=80&w=800",
      specialty: "Custom Design & Cover-Ups",
      bio: "Devon is the studio's master problem-solver. Armed with a background in graphic design and a fearless approach to bold compositions, Devon specializes in complex custom pieces and transformative cover-up work. If you have a story to tell on your skin — or a mistake to erase — Devon is your artist.",
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
        tuesday: { isOpen: true, hours: { start: "11:00", end: "20:00" }, breaks: [{ start: "15:00", end: "16:00", label: "Break" }] },
        wednesday: { isOpen: true, hours: { start: "11:00", end: "20:00" }, breaks: [{ start: "15:00", end: "16:00", label: "Break" }] },
        thursday: { isOpen: true, hours: { start: "11:00", end: "20:00" }, breaks: [{ start: "15:00", end: "16:00", label: "Break" }] },
        friday: { isOpen: true, hours: { start: "11:00", end: "20:00" }, breaks: [{ start: "15:00", end: "16:00", label: "Break" }] },
        saturday: { isOpen: true, hours: { start: "10:00", end: "19:00" }, breaks: [] },
        sunday: { isOpen: false, hours: { start: "00:00", end: "00:00" }, breaks: [] },
      },
    },
  ],

  // ─── Testimonials ─────────────────────────────────────────────────────────────
  testimonials: [
    {
      name: "Serena Blackwood",
      title: "Art Director",
      text: "Izzy took a rough sketch I'd been sitting on for three years and turned it into the most breathtaking piece of fine line work I've ever seen. The consultation alone was worth the trip.",
      rating: 5,
    },
    {
      name: "Damien Cruz",
      title: "Filmmaker",
      text: "Marco's black-and-grey realism is genuinely on another level. My sleeve looks like a photograph — people stop me on the street regularly. Worth every cent of the premium.",
      rating: 5,
    },
    {
      name: "Priya Nolan",
      title: "Architect",
      text: "I was terrified about getting a cover-up. Devon assessed my old tattoo, designed something completely custom, and the result is unrecognizable from what was there before. Pure transformation.",
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
      title: "Craft & Discipline",
      subtitle: "Our Services",
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
      title: "Ink & Identity // v1.0",
      subtitle: "The Artists",
      description:
        "Each artist at Masterpiece Ink was selected not just for technical excellence, but for a distinct creative voice. We don't hire technicians — we house visionaries. Your skin deserves nothing less.",
    },
    whyChooseUs: {
      title: "The Standard",
      subtitle: "Why Choose Us",
      // Premium tattoo studio interior — clean, professional, dramatic lighting
      mainImage:
        "https://images.unsplash.com/photo-1760877611905-0f885a3ce551?auto=format&fit=crop&q=80&w=1000",
      badge: "10 Years\nOf Art",
      benefits: [
        {
          iconName: "ShieldCheck",
          title: "Medical-Grade Hygiene",
          desc: "Single-use needles, autoclave-sterilized equipment, and hospital-grade surface disinfection after every single client. Your safety is our absolute non-negotiable.",
        },
        {
          iconName: "Clock",
          title: "Consultation First",
          desc: "Every piece begins with a dedicated consultation. We invest time understanding your vision before a single line is drawn — because permanence demands perfection.",
        },
        {
          iconName: "Award",
          title: "Award-Winning Artists",
          desc: "Our team holds international tattoo convention awards and features in leading industry publications. You are sitting in the chair of world-class talent.",
        },
        {
          iconName: "Zap",
          title: "Custom Art Only",
          desc: "No flash walls. No off-the-shelf designs. Every tattoo we create is an original artwork, designed exclusively for you and never reproduced.",
        },
      ],
    },
    testimonials: {
      title: "Voices of Trust",
      subtitle: "What Our Clients Say",
    },
    gallery: {
      title: "Permanent Masterpieces",
      subtitle: "The Portfolio",
    },
    location: {
      title: "Visit the Studio",
      subtitle: "Find Us",
    },
    contact: {
      title: "Get In Touch",
      subtitle: "Start Your Journey",
      description:
        "Ready to bring your vision to life? Send us a message, attach any reference images, and one of our artists will reach out to schedule your consultation.",
    },
    booking: {
      title: "Book Your Visit",
      tagline: "Start with a free consult — then schedule your session when you're ready.",
      steps: {
        service: "Service",
        staff: "Artist",
        datetime: "Schedule",
        details: "Confirm",
        payment: "Payment",
      },
      aiConsultant: {
        title: "Ink Intelligence",
        subtitle: "Not Sure Where to Start?",
        description:
          "Describe your idea and our AI specialist will recommend the right service, style, and artist — so you arrive at your consultation fully prepared.",
        agentLabel: "Creative Consultant",
        placeholder:
          "Describe your idea (e.g. 'A fine line botanical on my wrist, minimal and delicate')...",
      },
      success: {
        title: "Success",
        confirmed: "Confirmed!",
        requestSaved: "Request Saved!",
        cancelled: "Cancelled",
      },
    },
    admin: {
      staff: {
        title: "Artist Roster",
        scheduleTitle: "Weekly Studio Window",
        commitButton: "Save Schedule",
        enforcementTitle: "Schedule Enforcement Protocol",
        enforcementDesc:
          "Artist schedules are strictly enforced by the booking engine. Any changes to weekly windows or inactive days propagate instantly to the frontend, preventing impossible appointment allocations.",
      },
    },
  },
};
