import type { NichePreset } from "../../types";
import { presetThemeEstetica } from "./themes";

export const esteticaPresetEn: NichePreset = {
  business: {
    type: "estetica",
    legalName: "LUMIÈRE CLINIC LLC",
    address:
      "820 Park Avenue, Suite 4A, Upper East Side, New York, NY 10021, United States",
    cancellationPolicy: "24 hours prior to the scheduled treatment",
  },

  brand: {
    name: "LUMIÈRE CLINIC",
    tagline: "The Science of Natural Beauty",
    description:
      "A premier medical aesthetics clinic specializing in injectable treatments, advanced facials, and skin rejuvenation. Board-certified practitioners, FDA-approved products, and personalized protocols.",
    logoIconName: "Sparkles",
    ogImage: "/og-opengraph-barber.png",
    aiPersona:
      "You are a virtual skin consultant at a luxury medical aesthetics clinic. Guide clients with warmth and clinical precision, answer questions about injectable treatments, facials, and skin concerns, and recommend the most suitable treatment based on their needs.",
  },

  theme: presetThemeEstetica,

  hero: {
    titlePrefix: "THE SCIENCE",
    titleHighlight: "OF NATURAL",
    titleSuffix: "BEAUTY",
    subtitle:
      "Board-certified specialists. FDA-approved products. Your journey starts with a free, no-obligation consultation.",
    ctaPrimary: "Book Free Consultation",
    ctaSecondary: "Explore Treatments",
    backgroundImage:
      "https://images.unsplash.com/photo-1552693673-1bf958298935?auto=format&fit=crop&q=80&w=2000",
  },

  contact: {
    address: {
      street: "820 Park Avenue, Suite 4A",
      district: "Upper East Side",
      cityStateZip: "New York, NY 10021",
    },
    phone: "(212) 555-0194",
    email: "hello@lumiereclinic.com",
    social: {
      instagram: "https://instagram.com/lumiereclinic",
      facebook: "https://facebook.com/lumiereclinic",
    },
  },

  hours: {
    monday: { start: "09:00", end: "18:00" },
    tuesday: { start: "09:00", end: "18:00" },
    wednesday: { start: "09:00", end: "18:00" },
    thursday: { start: "09:00", end: "18:00" },
    friday: { start: "09:00", end: "18:00" },
    saturday: { start: "09:00", end: "14:00" },
    sunday: null,
  },

  // ─── Services ────────────────────────────────────────────────────────────────
  // CRITICAL: services[i] maps 1:1 to sections.services.images[i].
  // If you add a service here, add its corresponding image below.
  services: [
    {
      id: "lip-filler",
      name: "Lip Filler",
      description:
        "Subtle volume and definition using premium hyaluronic acid. Natural contour, no downtime, immediate results.",
      duration: 45,
      price: 450,
    },
    {
      id: "cheek-filler",
      name: "Cheek & Jawline Filler",
      description:
        "Structural contouring with cross-linked hyaluronic acid. Restores volume, lifts, and defines the mid-face with precision.",
      duration: 50,
      price: 550,
    },
    {
      id: "botox",
      name: "Botox",
      description:
        "FDA-approved neuromodulator for expression lines — forehead, crow's feet, and frown lines. Subtle, natural, zero downtime.",
      duration: 30,
      price: 350,
    },
    {
      id: "facial",
      name: "Signature Facial",
      description:
        "A bespoke clinical facial combining deep cleansing, medical-grade exfoliation, and targeted serums. Immediate glow.",
      duration: 60,
      price: 195,
    },
    {
      id: "skin-booster",
      name: "Skin Booster",
      description:
        "Micro-injections of non-cross-linked hyaluronic acid to deeply hydrate, improve elasticity, and restore radiance from within.",
      duration: 45,
      price: 500,
    },
  ],

  staff: [
    {
      id: "dr-anika",
      slug: "dr-anika-chen",
      name: "Dr. Anika Chen",
      photoUrl:
        "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=800",
      specialty: "Medical Aesthetics & Injectables",
      bio: "Board-certified in aesthetic medicine with over 10 years of experience in facial injectables. Dr. Chen is known for her 'less is more' philosophy — enhancing natural features without altering identity.",
      portfolio: [
        "https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&q=80&w=1200",
        "https://images.unsplash.com/photo-1512290923902-8a9f81dc236c?auto=format&fit=crop&q=80&w=1200",
        "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&q=80&w=1200",
        "https://images.unsplash.com/photo-1519823551278-64ac92734fb1?auto=format&fit=crop&q=80&w=1200",
      ],
      social: {
        instagram: "https://instagram.com/dranikachen",
      },
      schedule: {
        monday: {
          isOpen: true,
          hours: { start: "09:00", end: "18:00" },
          breaks: [{ start: "13:00", end: "14:00", label: "Lunch" }],
        },
        tuesday: {
          isOpen: true,
          hours: { start: "09:00", end: "18:00" },
          breaks: [{ start: "13:00", end: "14:00", label: "Lunch" }],
        },
        wednesday: {
          isOpen: true,
          hours: { start: "09:00", end: "18:00" },
          breaks: [{ start: "13:00", end: "14:00", label: "Lunch" }],
        },
        thursday: {
          isOpen: true,
          hours: { start: "09:00", end: "18:00" },
          breaks: [{ start: "13:00", end: "14:00", label: "Lunch" }],
        },
        friday: {
          isOpen: true,
          hours: { start: "09:00", end: "18:00" },
          breaks: [{ start: "13:00", end: "14:00", label: "Lunch" }],
        },
        saturday: {
          isOpen: true,
          hours: { start: "09:00", end: "14:00" },
          breaks: [],
        },
        sunday: {
          isOpen: false,
          hours: { start: "00:00", end: "00:00" },
          breaks: [],
        },
      },
    },
    {
      id: "maya",
      slug: "maya-torres",
      name: "Maya Torres",
      photoUrl:
        "https://images.unsplash.com/photo-1594744803329-e58b31de8bf5?auto=format&fit=crop&q=80&w=800",
      specialty: "Advanced Facials & Skin Health",
      bio: "Licensed medical aesthetician with dual certification in clinical skincare and chemical peels. Maya designs every facial as a protocol — systematic, evidence-based, and tailored to your skin's current state.",
      portfolio: [
        "https://images.unsplash.com/photo-1616394584738-fc6e612e71b9?auto=format&fit=crop&q=80&w=1200",
        "https://images.unsplash.com/photo-1601049541271-70d659f88be8?auto=format&fit=crop&q=80&w=1200",
        "https://images.unsplash.com/photo-1515377905703-c4788e51af15?auto=format&fit=crop&q=80&w=1200",
        "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&q=80&w=1200",
      ],
      social: {
        instagram: "https://instagram.com/mayatorres_skin",
      },
      schedule: {
        monday: {
          isOpen: false,
          hours: { start: "00:00", end: "00:00" },
          breaks: [],
        },
        tuesday: {
          isOpen: true,
          hours: { start: "10:00", end: "18:00" },
          breaks: [{ start: "13:30", end: "14:30", label: "Break" }],
        },
        wednesday: {
          isOpen: true,
          hours: { start: "10:00", end: "18:00" },
          breaks: [{ start: "13:30", end: "14:30", label: "Break" }],
        },
        thursday: {
          isOpen: true,
          hours: { start: "10:00", end: "18:00" },
          breaks: [{ start: "13:30", end: "14:30", label: "Break" }],
        },
        friday: {
          isOpen: true,
          hours: { start: "10:00", end: "18:00" },
          breaks: [{ start: "13:30", end: "14:30", label: "Break" }],
        },
        saturday: {
          isOpen: true,
          hours: { start: "09:00", end: "14:00" },
          breaks: [],
        },
        sunday: {
          isOpen: false,
          hours: { start: "00:00", end: "00:00" },
          breaks: [],
        },
      },
    },
    {
      id: "david",
      slug: "david-park",
      name: "David Park, RN",
      photoUrl:
        "https://images.unsplash.com/photo-1582750433449-648ed127bb54?auto=format&fit=crop&q=80&w=800",
      specialty: "Injectable Specialist & Skin Boosters",
      bio: "Registered nurse with advanced training in dermal fillers and skin-booster protocols. David combines clinical rigor with an artistic eye for facial symmetry and proportion.",
      portfolio: [
        "https://images.unsplash.com/photo-1612817288484-6f916006741a?auto=format&fit=crop&q=80&w=1200",
        "https://images.unsplash.com/photo-1583772096048-47cb5ca30a6f?auto=format&fit=crop&q=80&w=1200",
        "https://images.unsplash.com/photo-1560472355-536de3962603?auto=format&fit=crop&q=80&w=1200",
        "https://images.unsplash.com/photo-1631217868264-e5b90bb7e133?auto=format&fit=crop&q=80&w=1200",
      ],
      social: {
        instagram: "https://instagram.com/davidpark_aesthetics",
      },
      schedule: {
        monday: {
          isOpen: true,
          hours: { start: "09:00", end: "17:00" },
          breaks: [{ start: "12:30", end: "13:30", label: "Lunch" }],
        },
        tuesday: {
          isOpen: true,
          hours: { start: "09:00", end: "17:00" },
          breaks: [{ start: "12:30", end: "13:30", label: "Lunch" }],
        },
        wednesday: {
          isOpen: true,
          hours: { start: "09:00", end: "17:00" },
          breaks: [{ start: "12:30", end: "13:30", label: "Lunch" }],
        },
        thursday: {
          isOpen: true,
          hours: { start: "09:00", end: "17:00" },
          breaks: [{ start: "12:30", end: "13:30", label: "Lunch" }],
        },
        friday: {
          isOpen: true,
          hours: { start: "09:00", end: "17:00" },
          breaks: [{ start: "12:30", end: "13:30", label: "Lunch" }],
        },
        saturday: {
          isOpen: false,
          hours: { start: "00:00", end: "00:00" },
          breaks: [],
        },
        sunday: {
          isOpen: false,
          hours: { start: "00:00", end: "00:00" },
          breaks: [],
        },
      },
    },
  ],

  testimonials: [
    {
      name: "Rachel Kim",
      title: "Marketing Director",
      text: "I was terrified of looking 'done.' Dr. Chen put me completely at ease and the results are so natural — my friends just say I look rested. That's exactly what I wanted.",
      rating: 5,
    },
    {
      name: "Gabriella Santos",
      title: "Interior Designer",
      text: "Maya's facials are the only ones that actually changed my skin long-term. After three sessions, my texture and tone are completely different. I'm a convert.",
      rating: 5,
    },
    {
      name: "Lauren Whitfield",
      title: "Attorney",
      text: "Clean, quiet, professional. No overselling, no pressure. David explained every step before touching my face. The lip filler result is subtle and perfect.",
      rating: 5,
    },
  ],

  // ─── Gallery ─────────────────────────────────────────────────────────────────
  // 12 curated clinical aesthetics images: treatments, results, clinic environment.
  gallery: [
    "https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1616394584738-fc6e612e71b9?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1512290923902-8a9f81dc236c?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1601049541271-70d659f88be8?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1515377905703-c4788e51af15?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1612817288484-6f916006741a?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1560472355-536de3962603?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1631217868264-e5b90bb7e133?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1519823551278-64ac92734fb1?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1583772096048-47cb5ca30a6f?auto=format&fit=crop&q=80&w=1200",
  ],

  sections: {
    services: {
      title: "Precision Protocols",
      subtitle: "Our Treatments",
      // One image per service, same order as services[].
      images: [
        "https://images.unsplash.com/photo-1512290923902-8a9f81dc236c?auto=format&fit=crop&q=80&w=600",
        "https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&q=80&w=600",
        "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&q=80&w=600",
        "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&q=80&w=600",
        "https://images.unsplash.com/photo-1519823551278-64ac92734fb1?auto=format&fit=crop&q=80&w=600",
      ],
    },
    team: {
      title: "Our Specialists",
      subtitle: "Expert Hands",
      description:
        "Board-certified physicians, licensed aestheticians, and registered nurses — each with years of clinical training and a shared commitment to natural, evidence-based results.",
    },
    whyChooseUs: {
      title: "Our Standard",
      subtitle: "Why Lumière",
      mainImage:
        "https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&q=80&w=1000",
      badge: "Board\nCertified",
      benefits: [
        {
          iconName: "ShieldCheck",
          title: "FDA-Approved Products",
          desc: "Every injectable and product used in our clinic is FDA-approved. We never compromise on safety or provenance.",
        },
        {
          iconName: "Award",
          title: "Certified Practitioners",
          desc: "Our team holds board certifications and advanced credentials. Continuous education is not optional — it is mandatory.",
        },
        {
          iconName: "HeartHandshake",
          title: "Natural Results Philosophy",
          desc: "We enhance, we don't transform. Every treatment plan is designed to preserve your unique features — never erase them.",
        },
        {
          iconName: "Microscope",
          title: "Personalized Protocols",
          desc: "No two faces are alike. Every client receives a custom assessment and a treatment plan tailored to their anatomy and goals.",
        },
      ],
    },
    testimonials: {
      title: "Client Experiences",
      subtitle: "What They Say",
    },
    gallery: {
      title: "Before & After",
      subtitle: "Real Results",
    },
    location: {
      title: "Visit Us",
      subtitle: "Find Our Clinic",
    },
    contact: {
      title: "Get In Touch",
      subtitle: "Book a Free Consultation",
      description:
        "Every treatment begins with a conversation. Book a free, in-person consultation and one of our specialists will design a plan around your goals.",
    },
    booking: {
      title: "Book Treatment",
      tagline: "The Science of Natural Beauty",
      steps: {
        service: "Treatment",
        staff: "Specialist",
        datetime: "Schedule",
        details: "Confirm",
        payment: "Payment",
      },
      aiConsultant: {
        title: "AI Skin Advisor",
        subtitle: "Not Sure Where to Start?",
        description:
          "Describe your skin concern and our AI advisor will suggest the most suitable treatment.",
        agentLabel: "Skin Advisor",
        placeholder:
          "Describe your skin concern or what you'd like to improve (e.g. 'fine lines around eyes, volume loss in cheeks')...",
      },
      success: {
        title: "Confirmed",
        confirmed: "Appointment Booked!",
        requestSaved: "Request Saved!",
        cancelled: "Cancelled",
      },
    },
    admin: {
      staff: {
        title: "Specialist Directory",
        scheduleTitle: "Weekly Availability",
        commitButton: "Save Schedule",
        enforcementTitle: "Availability Enforcement",
        enforcementDesc:
          "Specialist schedules are enforced in real time. Changes to availability or blocked days take effect immediately, preventing double-bookings.",
      },
    },
  },
};
