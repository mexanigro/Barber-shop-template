import type { NichePreset } from "../../types";

export const barberiaPresetEn: NichePreset = {
  business: {
    type: "barberia",
    legalName: "ONYX & STEEL GROOMING LLC",
    address:
      "123 Precision Way, Downtown Arts District, New York, NY 10012, United States",
    cancellationPolicy: "24 hours prior to the scheduled appointment start time",
  },

  brand: {
    name: "ONYX & STEEL",
    tagline: "The Modern Gentleman's Sanctuary",
    description:
      "A premier grooming destination where time-honored artistry meets contemporary precision. Book your exclusive grooming experience.",
    logoIconName: "Scissors",
    aiPersona:
      "You are a virtual specialist in luxury gentlemen's grooming. Your mission is to guide clients with elegance, answer their questions concisely, and recommend the Onyx & Steel services that best complement their personal style.",
  },

  hero: {
    titlePrefix: "PRECISION",
    titleHighlight: "CRAFTED",
    titleSuffix: "FOR THE MODERN GENTLEMAN",
    subtitle:
      "Where master artisans sculpt confidence into every cut. Grooming elevated to the discipline of fine craft.",
    ctaPrimary: "RESERVE YOUR CHAIR",
    ctaSecondary: "OUR SERVICES",
    backgroundImage:
      "https://images.unsplash.com/photo-1532710093739-9470acff878f?auto=format&fit=crop&q=80&w=2000",
  },

  contact: {
    address: {
      street: "123 Precision Way",
      district: "Downtown Arts District",
      cityStateZip: "New York, NY 10012",
    },
    phone: "(555) 123-4567",
    email: "hello@onyxandsteel.com",
    social: {
      instagram: "https://instagram.com/onyxandsteel",
      facebook: "https://facebook.com/onyxandsteel",
      twitter: "https://twitter.com/onyxandsteel",
    },
  },

  hours: {
    monday: { start: "09:00", end: "20:00" },
    tuesday: { start: "09:00", end: "20:00" },
    wednesday: { start: "09:00", end: "20:00" },
    thursday: { start: "09:00", end: "20:00" },
    friday: { start: "09:00", end: "21:00" },
    saturday: { start: "10:00", end: "18:00" },
    sunday: null,
  },

  // ─── Services ────────────────────────────────────────────────────────────────
  // CRITICAL: services[i] maps 1:1 to sections.services.images[i].
  // If you add a service here, add its corresponding image below.
  services: [
    {
      id: "haircut",
      name: "Classic Haircut",
      description:
        "A precision cut sculpted to the geometry of your face. Japanese shears, razor-line finish, and a luxury styling product to seal the look.",
      duration: 30,
      price: 45,
    },
    {
      id: "beard-sculpt",
      name: "Beard Sculpture",
      description:
        "Millimeter-perfect outlining with a straight razor, contour definition, and an argan-oil hydrating balm. The beard you've always deserved.",
      duration: 25,
      price: 35,
    },
    {
      id: "straight-shave",
      name: "Straight Razor Shave",
      description:
        "A classic shaving ritual: hot towel preparation, artisan sandalwood lather, and a stainless steel straight razor. Skin as smooth as polished steel.",
      duration: 35,
      price: 40,
    },
    {
      id: "color-treatment",
      name: "Color & Tint",
      description:
        "Grey blending or full-color coverage using ammonia-free luxury pigments. Natural, long-lasting, and camera-ready.",
      duration: 50,
      price: 65,
    },
    {
      id: "full-ritual",
      name: "The Full Ritual",
      description:
        "The complete Onyx & Steel experience: precision haircut, beard sculpture, hot towel treatment, and a revitalizing hair serum.",
      duration: 75,
      price: 90,
    },
  ],

  staff: [
    {
      id: "alex",
      slug: "alex-reed",
      name: "Alex 'The Blade' Reed",
      // Avatar: professional barber in black apron inside barbershop
      photoUrl:
        "https://images.unsplash.com/photo-1717700921740-a1440f3b89a4?auto=format&fit=crop&q=80&w=800",
      specialty: "Classic Fades & Tapers",
      bio: "With over 12 years behind the chair, Alex commands the full spectrum of skin fades and classic silhouettes — a precision that transforms every cut into a personal signature.",
      // Portfolio: finished haircut RESULTS only — no process shots, no capes
      portfolio: [
        "https://images.unsplash.com/photo-1568339434343-2a640a1a9946?auto=format&fit=crop&q=80&w=1200",
        "https://images.unsplash.com/photo-1618049049816-43a00d5b0c3d?auto=format&fit=crop&q=80&w=1200",
        "https://images.unsplash.com/photo-1456327102063-fb5054efe647?auto=format&fit=crop&q=80&w=1200",
        "https://images.unsplash.com/photo-1578390432942-d323db577792?auto=format&fit=crop&q=80&w=1200",
      ],
      social: {
        instagram: "https://instagram.com/alexblade",
        twitter: "https://twitter.com/alexblade",
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
          hours: { start: "10:00", end: "16:00" },
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
      id: "daniel",
      slug: "daniel-petrocelli",
      name: "Daniel Petrocelli",
      // Avatar: urban barber with apron and tattoo on arm
      photoUrl:
        "https://images.unsplash.com/photo-1723021073699-77f5442510a2?auto=format&fit=crop&q=80&w=800",
      specialty: "Beard Artistry & Grooming",
      bio: "Daniel is a master of facial hair. His command of the straight razor and beard contouring has made him the city's foremost authority on luxury wet shaving.",
      // Portfolio: finished beard RESULTS only — sculpted beards, clean lines
      portfolio: [
        "https://images.unsplash.com/photo-1657105052388-e839d5d0f395?auto=format&fit=crop&q=80&w=1200",
        "https://images.unsplash.com/photo-1659212165922-b1b64fc04ccf?auto=format&fit=crop&q=80&w=1200",
        "https://images.unsplash.com/photo-1674456483643-05448d24cd77?auto=format&fit=crop&q=80&w=1200",
        "https://images.unsplash.com/photo-1551810104-58185e8cfd0c?auto=format&fit=crop&q=80&w=1200",
      ],
      social: {
        instagram: "https://instagram.com/danielgrooming",
      },
      schedule: {
        monday: {
          isOpen: false,
          hours: { start: "00:00", end: "00:00" },
          breaks: [],
        },
        tuesday: {
          isOpen: true,
          hours: { start: "10:00", end: "19:00" },
          breaks: [{ start: "14:00", end: "15:00", label: "Break" }],
        },
        wednesday: {
          isOpen: true,
          hours: { start: "10:00", end: "19:00" },
          breaks: [{ start: "14:00", end: "15:00", label: "Break" }],
        },
        thursday: {
          isOpen: true,
          hours: { start: "10:00", end: "19:00" },
          breaks: [{ start: "14:00", end: "15:00", label: "Break" }],
        },
        friday: {
          isOpen: true,
          hours: { start: "10:00", end: "19:00" },
          breaks: [{ start: "14:00", end: "15:00", label: "Break" }],
        },
        saturday: {
          isOpen: true,
          hours: { start: "10:00", end: "19:00" },
          breaks: [{ start: "14:00", end: "15:00", label: "Break" }],
        },
        sunday: {
          isOpen: false,
          hours: { start: "00:00", end: "00:00" },
          breaks: [],
        },
      },
    },
    {
      id: "michael",
      slug: "michael-vane",
      name: "Michael Vane",
      // Avatar: barber in black long sleeve shirt, barbershop setting
      photoUrl:
        "https://images.unsplash.com/photo-1619233543112-fe382ff3693d?auto=format&fit=crop&q=80&w=800",
      specialty: "Scissor Work & Texture",
      bio: "Michael fuses European scissor techniques with contemporary texture work. The result: effortless-looking styles that project undeniable authority.",
      // Portfolio: finished textured cut RESULTS only — no process shots
      portfolio: [
        "https://images.unsplash.com/photo-1587776535733-b4c80a99ef82?auto=format&fit=crop&q=80&w=1200",
        "https://images.unsplash.com/photo-1584864650621-95648f07518e?auto=format&fit=crop&q=80&w=1200",
        "https://images.unsplash.com/photo-1648742468740-6347e05c7faa?auto=format&fit=crop&q=80&w=1200",
        "https://images.unsplash.com/photo-1516646720587-727f6728837d?auto=format&fit=crop&q=80&w=1200",
      ],
      social: {
        instagram: "https://instagram.com/michaelvane",
        twitter: "https://twitter.com/michaelvane",
      },
      schedule: {
        monday: {
          isOpen: true,
          hours: { start: "09:00", end: "17:00" },
          breaks: [{ start: "12:00", end: "13:00", label: "Lunch" }],
        },
        tuesday: {
          isOpen: true,
          hours: { start: "09:00", end: "17:00" },
          breaks: [{ start: "12:00", end: "13:00", label: "Lunch" }],
        },
        wednesday: {
          isOpen: true,
          hours: { start: "09:00", end: "17:00" },
          breaks: [{ start: "12:00", end: "13:00", label: "Lunch" }],
        },
        thursday: {
          isOpen: true,
          hours: { start: "09:00", end: "17:00" },
          breaks: [{ start: "12:00", end: "13:00", label: "Lunch" }],
        },
        friday: {
          isOpen: true,
          hours: { start: "09:00", end: "17:00" },
          breaks: [{ start: "12:00", end: "13:00", label: "Lunch" }],
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
      name: "Marcus Thorne",
      title: "CEO, TechSolutions",
      text: "The precision here is in a class of its own. Alex read the geometry of my face before picking up a single tool. I walked out of that chair feeling like a different man.",
      rating: 5,
    },
    {
      name: "Julian Vane",
      title: "Architect",
      text: "Daniel's straight razor technique is a form of meditation. The closest, cleanest shave I've had in two decades. I won't be going anywhere else.",
      rating: 5,
    },
    {
      name: "Elias Reed",
      title: "Photographer",
      text: "Dark interior, focused energy, world-class result. This is exactly what a barbershop should feel like. No theatrics — just pure mastery.",
      rating: 5,
    },
  ],

  // ─── Gallery ─────────────────────────────────────────────────────────────────
  // 12 curated result-only shots: clean fades, textured styles, sculpted beards.
  // Rule: NO process shots, NO scissors/clippers in frame, NO capes on clients.
  gallery: [
    "https://images.unsplash.com/photo-1568339434343-2a640a1a9946?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1618049049816-43a00d5b0c3d?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1456327102063-fb5054efe647?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1578390432942-d323db577792?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1657105052388-e839d5d0f395?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1659212165922-b1b64fc04ccf?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1674456483643-05448d24cd77?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1551810104-58185e8cfd0c?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1587776535733-b4c80a99ef82?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1584864650621-95648f07518e?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1648742468740-6347e05c7faa?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1516646720587-727f6728837d?auto=format&fit=crop&q=80&w=1200",
  ],

  sections: {
    services: {
      title: "Art & Craft",
      subtitle: "Premium Services",
      // ACTION shots — one per service, same order as services[].
      // Rule: each image must show the barber actively performing that specific service.
      // services[0] Classic Haircut       → barber in white shirt cutting client's hair
      // services[1] Beard Sculpture       → barber detailing / sculpting a beard
      // services[2] Straight Razor Shave  → straight-razor shave in progress
      // services[3] Color & Tint          → barber applying hair color treatment
      // services[4] The Full Ritual       → client receiving full barbershop session
      images: [
        "https://images.unsplash.com/photo-1593702275687-f8b402bf1fb5?auto=format&fit=crop&q=80&w=600",
        "https://images.unsplash.com/photo-1621605815971-fbc98d665033?auto=format&fit=crop&q=80&w=600",
        "https://images.unsplash.com/photo-1761148438883-e34e0289a214?auto=format&fit=crop&q=80&w=600",
        "https://images.unsplash.com/photo-1634449571010-02389ed0f9b0?auto=format&fit=crop&q=80&w=600",
        "https://images.unsplash.com/photo-1654097800183-574ba7368f74?auto=format&fit=crop&q=80&w=600",
      ],
    },
    team: {
      title: "Masters of the Trade // v1.0",
      subtitle: "The Artisans",
      description:
        "Hand-selected for technical precision, sculptural vision, and an unwavering commitment to the integrity of the modern male silhouette. Every chair is occupied by a master.",
    },
    whyChooseUs: {
      title: "The Standard",
      subtitle: "Why Choose Us",
      mainImage:
        "https://images.unsplash.com/photo-1512690196236-724d90957dc3?auto=format&fit=crop&q=80&w=1000",
      badge: "10 Years\nOf Mastery",
      benefits: [
        {
          iconName: "ShieldCheck",
          title: "Absolute Hygiene",
          desc: "Medical-grade sterilization of all instruments after every single client. Your safety is our non-negotiable standard.",
        },
        {
          iconName: "Clock",
          title: "Swiss Punctuality",
          desc: "We respect your schedule. We start on time, every time. No waiting lists, no excuses.",
        },
        {
          iconName: "Award",
          title: "Master Craftsmanship",
          desc: "Our team undergoes rigorous training and certifications to master every technique and every hair type.",
        },
        {
          iconName: "Zap",
          title: "Sharp Results",
          desc: "Precision is not a goal — it is our standard. We don't stop until every line is perfect.",
        },
      ],
    },
    testimonials: {
      title: "Voices of Trust",
      subtitle: "What Our Clients Say",
    },
    gallery: {
      title: "Visual Mastery",
      subtitle: "The Portfolio",
    },
    location: {
      title: "Visit Us",
      subtitle: "Find The Chair",
    },
    contact: {
      title: "Get In Touch",
      subtitle: "Send Us An Inquiry",
      description:
        "Have a special request or a question? Drop us a line and our team will respond promptly.",
    },
    booking: {
      title: "Book Appointment",
      tagline: "The Modern Gentleman's Sanctuary Experience",
      steps: {
        service: "Service",
        staff: "Artisan",
        datetime: "Schedule",
        details: "Confirm",
        payment: "Payment",
      },
      aiConsultant: {
        title: "Neural Intelligence",
        subtitle: "Need Style Precision?",
        description:
          "Ask our AI specialist to recommend your next grooming mission.",
        agentLabel: "Consulting Agent",
        placeholder:
          "Describe your vision (e.g. 'Low fade with a blended beard and a hard part')...",
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
        title: "Tactical Personnel",
        scheduleTitle: "Weekly Operational Window",
        commitButton: "Save Schedule",
        enforcementTitle: "Temporal Enforcement Protocol",
        enforcementDesc:
          "Staff schedules are strictly enforced by the booking engine. Any changes to weekly windows or inactive days will propagate instantly to the frontend, preventing impossible appointment allocations.",
      },
    },
  },
};
