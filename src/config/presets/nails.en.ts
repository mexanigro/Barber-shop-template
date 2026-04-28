import type { NichePreset } from "../../types";
import { presetThemeNails } from "./themes";

export const nailsPresetEn: NichePreset = {
  // ─── Business & Legal ────────────────────────────────────────────────────────
  business: {
    type: "nails",
    legalName: "AURA NAIL STUDIO LLC",
    address: "214 Bloom Street, Design District, Miami, FL 33132, United States",
    cancellationPolicy: "24 hours prior to the scheduled appointment",
  },

  // ─── Brand ───────────────────────────────────────────────────────────────────
  brand: {
    name: "AURA NAIL STUDIO",
    tagline: "Where Every Detail Shines",
    description:
      "An upscale nail studio offering precision nail artistry, long-lasting gel systems, and bespoke nail design. Every appointment is a private, unhurried experience crafted around your aesthetic.",
    logoIconName: "Sparkles",
    aiPersona:
      "You are a virtual specialist at Aura Nail Studio, a premium nail studio in Miami's Design District. Your mission is to guide clients with warmth and expertise — answer questions about our services, help them prepare for their appointment, explain aftercare, and recommend the right technician and treatment for their vision. Be warm, knowledgeable, and beauty-focused.",
  },

  theme: presetThemeNails,

  // ─── Hero ─────────────────────────────────────────────────────────────────────
  hero: {
    titlePrefix: "YOUR NAILS,",
    titleHighlight: "OUR ART",
    titleSuffix: "PRECISION BEAUTY, EVERY TIME",
    subtitle:
      "Every appointment begins with a personalized nail design briefing to define your shape, finish, and style direction before your service begins. Custom nail artistry executed with expert precision.",
    ctaPrimary: "BOOK YOUR SESSION",
    ctaSecondary: "VIEW GALLERY",
    // Luxury nail salon interior — soft lighting, elegant station, premium aesthetic
    backgroundImage:
      "https://images.unsplash.com/photo-1604654894610-df63bc536371?auto=format&fit=crop&q=80&w=2000",
  },

  // ─── Contact ─────────────────────────────────────────────────────────────────
  contact: {
    address: {
      street: "214 Bloom Street",
      district: "Design District",
      cityStateZip: "Miami, FL 33132",
    },
    phone: "(305) 555-0182",
    email: "hello@auranailstudio.com",
    social: {
      instagram: "https://instagram.com/auranailstudio",
      facebook: "https://facebook.com/auranailstudio",
      twitter: "https://twitter.com/auranailstudio",
    },
  },

  // ─── Business Hours ───────────────────────────────────────────────────────────
  hours: {
    monday: null,
    tuesday: { start: "10:00", end: "19:00" },
    wednesday: { start: "10:00", end: "19:00" },
    thursday: { start: "10:00", end: "19:00" },
    friday: { start: "10:00", end: "19:00" },
    saturday: { start: "10:00", end: "19:00" },
    sunday: { start: "11:00", end: "17:00" },
  },

  // ─── Services ────────────────────────────────────────────────────────────────
  // CRITICAL: services[i] maps 1:1 to sections.services.images[i].
  // If you add or reorder a service here, update sections.services.images below.
  //
  // Pricing model:
  //   services[0] Classic Manicure          → $45 flat
  //   services[1] Gel Manicure              → $65 flat
  //   services[2] Acrylic Full Set          → $85 flat
  //   services[3] Nail Art & Bespoke        → from $25/nail
  //   services[4] Luxury Spa Pedicure       → $75 flat
  //   services[5] Nail Extensions & Infills → from $55
  services: [
    {
      id: "classic-manicure",
      name: "Classic Manicure",
      description:
        "The foundation of beautiful nails. Your technician shapes and files your nails to your preferred silhouette, carefully tends to cuticles, delivers a soothing hand and wrist massage, and applies your choice of polish with a flawless, streak-free finish. A complete 45-minute ritual.",
      duration: 45,
      price: 45,
    },
    {
      id: "gel-manicure",
      name: "Gel Manicure",
      description:
        "Long-lasting colour cured under UV light for a mirror-shine finish that resists chips and fading for up to three weeks. Includes full shaping, cuticle care, a nourishing hand treatment, and your choice from our curated gel colour library. Perfect for busy schedules and travel.",
      duration: 60,
      price: 65,
    },
    {
      id: "acrylic-full-set",
      name: "Acrylic Full Set",
      description:
        "Sculpted acrylic extensions crafted to your exact specification — length, shape, and finish all tailored in the chair. Whether you prefer coffin, almond, square, or stiletto, our technicians hand-sculpt each nail for structural integrity and seamless integration with your natural nail.",
      duration: 90,
      price: 85,
    },
    {
      id: "nail-art",
      name: "Nail Art & Bespoke Design",
      description:
        "Elevate your nails into wearable art. Hand-painted motifs, micro-detailing, gemstone embellishments, chrome powders, and full 3D sculptural elements — all executed to a custom brief. Quoted per nail based on design complexity. Bring your references or let us design for you.",
      duration: 60,
      price: 25,
    },
    {
      id: "spa-pedicure",
      name: "Luxury Spa Pedicure",
      description:
        "A complete lower-leg and foot ritual: warm soak in aromatic mineral salts, full exfoliation scrub, a hydrating mask, extended calf and foot massage, expert nail shaping, and a gel polish finish of your choice. 75 minutes of uninterrupted indulgence.",
      duration: 75,
      price: 75,
    },
    {
      id: "extensions-infills",
      name: "Nail Extensions & Infills",
      description:
        "Maintain your existing acrylic or hard gel set with a precision infill that restores length, corrects growth gaps, and refreshes the finish. Includes shaping, cuticle care, and a colour refresh. Also available as a full extension service for new length over your natural nail.",
      duration: 60,
      price: 55,
    },
  ],

  // ─── Staff ───────────────────────────────────────────────────────────────────
  staff: [
    {
      id: "sofia",
      slug: "sofia-reyes",
      name: "Sofia Reyes",
      // Portrait: professional female beauty technician, warm studio setting
      photoUrl:
        "https://images.unsplash.com/photo-1594744803329-e58b31de8bf5?auto=format&fit=crop&q=80&w=800",
      specialty: "Gel & Nail Art",
      bio: "Sofia trained as a fine artist before discovering her true canvas — nails. With eight years of experience and a background in illustration, she brings an extraordinary eye for detail to every set she creates. Renowned for intricate hand-painted designs, delicate botanicals, and miniature portraiture, Sofia's work regularly features in Miami lifestyle publications. She approaches every client's brief as a genuine creative collaboration.",
      // Portfolio: finished nail art and gel manicure results only
      portfolio: [
        "https://images.unsplash.com/photo-1604654894610-df63bc536371?auto=format&fit=crop&q=80&w=1200",
        "https://images.unsplash.com/photo-1604654894610-df63bc536371?auto=format&fit=crop&q=80&w=1200",
        "https://images.unsplash.com/photo-1519014816548-bf5fe059798b?auto=format&fit=crop&q=80&w=1200",
        "https://images.unsplash.com/photo-1519014816548-bf5fe059798b?auto=format&fit=crop&q=80&w=1200",
      ],
      social: {
        instagram: "https://instagram.com/sofiareyes.nails",
        twitter: "https://twitter.com/sofiareyes",
      },
      schedule: {
        monday: { isOpen: false, hours: { start: "00:00", end: "00:00" }, breaks: [] },
        tuesday: { isOpen: true, hours: { start: "10:00", end: "18:00" }, breaks: [{ start: "13:00", end: "14:00", label: "Lunch" }] },
        wednesday: { isOpen: true, hours: { start: "10:00", end: "18:00" }, breaks: [{ start: "13:00", end: "14:00", label: "Lunch" }] },
        thursday: { isOpen: true, hours: { start: "10:00", end: "19:00" }, breaks: [{ start: "13:00", end: "14:00", label: "Lunch" }] },
        friday: { isOpen: true, hours: { start: "10:00", end: "19:00" }, breaks: [{ start: "14:00", end: "15:00", label: "Break" }] },
        saturday: { isOpen: true, hours: { start: "10:00", end: "18:00" }, breaks: [] },
        sunday: { isOpen: false, hours: { start: "00:00", end: "00:00" }, breaks: [] },
      },
    },
    {
      id: "camille",
      slug: "camille-dupont",
      name: "Camille Dupont",
      // Portrait: professional female beauty technician, elegant studio
      photoUrl:
        "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&q=80&w=800",
      specialty: "Acrylics & Sculpting",
      bio: "Camille trained at a leading nail academy in Paris before relocating to Miami, bringing a distinctly European precision to her sculpting work. She specialises in architectural nail shapes — long coffins, refined almonds, dramatic stilettos — with flawlessly smooth acrylic application that holds its structure for weeks. Camille's sets are as technically sound as they are visually striking.",
      // Portfolio: finished acrylic sets and sculpted nail results only
      portfolio: [
        "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&q=80&w=1200",
        "https://images.unsplash.com/photo-1604654894610-df63bc536371?auto=format&fit=crop&q=80&w=1200",
        "https://images.unsplash.com/photo-1519014816548-bf5fe059798b?auto=format&fit=crop&q=80&w=1200",
        "https://images.unsplash.com/photo-1519014816548-bf5fe059798b?auto=format&fit=crop&q=80&w=1200",
      ],
      social: {
        instagram: "https://instagram.com/camilledupont.nails",
        facebook: "https://facebook.com/camilledupont",
      },
      schedule: {
        monday: { isOpen: false, hours: { start: "00:00", end: "00:00" }, breaks: [] },
        tuesday: { isOpen: false, hours: { start: "00:00", end: "00:00" }, breaks: [] },
        wednesday: { isOpen: true, hours: { start: "10:00", end: "19:00" }, breaks: [{ start: "13:00", end: "14:00", label: "Lunch" }] },
        thursday: { isOpen: true, hours: { start: "10:00", end: "19:00" }, breaks: [{ start: "13:00", end: "14:00", label: "Lunch" }] },
        friday: { isOpen: true, hours: { start: "10:00", end: "19:00" }, breaks: [{ start: "14:00", end: "15:00", label: "Break" }] },
        saturday: { isOpen: true, hours: { start: "10:00", end: "19:00" }, breaks: [{ start: "13:30", end: "14:30", label: "Lunch" }] },
        sunday: { isOpen: true, hours: { start: "11:00", end: "17:00" }, breaks: [] },
      },
    },
    {
      id: "yuki",
      slug: "yuki-tanaka",
      name: "Yuki Tanaka",
      // Portrait: professional female beauty technician, calm and polished aesthetic
      photoUrl:
        "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?auto=format&fit=crop&q=80&w=800",
      specialty: "Classic & Spa Treatments",
      bio: "Yuki trained in Japan's renowned nail and wellness tradition, where meticulous technique and a tranquil client experience are held in equal esteem. She specialises in classic manicures, gel finishes, and luxury spa pedicures — services she treats with the same reverence as any bespoke art form. Clients consistently note that a session with Yuki is as restorative as it is beautiful.",
      // Portfolio: finished classic manicure and spa pedicure results only
      portfolio: [
        "https://images.unsplash.com/photo-1604654894610-df63bc536371?auto=format&fit=crop&q=80&w=1200",
        "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&q=80&w=1200",
        "https://images.unsplash.com/photo-1604654894610-df63bc536371?auto=format&fit=crop&q=80&w=1200",
        "https://images.unsplash.com/photo-1519014816548-bf5fe059798b?auto=format&fit=crop&q=80&w=1200",
      ],
      social: {
        instagram: "https://instagram.com/yukitanaka.nails",
        twitter: "https://twitter.com/yukitanaka",
      },
      schedule: {
        monday: { isOpen: false, hours: { start: "00:00", end: "00:00" }, breaks: [] },
        tuesday: { isOpen: true, hours: { start: "10:00", end: "19:00" }, breaks: [{ start: "13:00", end: "14:00", label: "Lunch" }] },
        wednesday: { isOpen: true, hours: { start: "10:00", end: "19:00" }, breaks: [{ start: "13:00", end: "14:00", label: "Lunch" }] },
        thursday: { isOpen: true, hours: { start: "10:00", end: "19:00" }, breaks: [{ start: "13:00", end: "14:00", label: "Lunch" }] },
        friday: { isOpen: true, hours: { start: "10:00", end: "19:00" }, breaks: [{ start: "14:00", end: "15:00", label: "Break" }] },
        saturday: { isOpen: true, hours: { start: "10:00", end: "19:00" }, breaks: [] },
        sunday: { isOpen: true, hours: { start: "11:00", end: "17:00" }, breaks: [] },
      },
    },
  ],

  // ─── Testimonials ─────────────────────────────────────────────────────────────
  testimonials: [
    {
      name: "Alessandra Monroe",
      title: "Fashion Stylist",
      text: "I've been to nail studios across Miami and nothing compares to Aura. Sofia hand-painted a floral design on my nails that had clients at my shoot asking where I went. The consultation beforehand made all the difference — she understood my aesthetic immediately.",
      rating: 5,
    },
    {
      name: "Natalie Chen",
      title: "Interior Designer",
      text: "Camille's acrylic work is in a category of its own. My coffin set has held its shape for five weeks without a single lift. The studio itself is immaculate and the whole experience feels genuinely luxurious, not just expensive.",
      rating: 5,
    },
    {
      name: "Rachel Torres",
      title: "Marketing Director",
      text: "I booked the Luxury Spa Pedicure with Yuki after a particularly brutal week and left feeling completely restored. The attention to hygiene is obvious the moment you sit down, and the treatment itself was the most thorough pedicure I've ever had. Already rebooked.",
      rating: 5,
    },
  ],

  // ─── Gallery ─────────────────────────────────────────────────────────────────
  // 12 curated finished nail art and manicure shots.
  // Rule: NO process shots, NO bare unpolished hands. Only completed nail looks.
  gallery: [
    "https://images.unsplash.com/photo-1604654894610-df63bc536371?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1604654894610-df63bc536371?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1519014816548-bf5fe059798b?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1519014816548-bf5fe059798b?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1604654894610-df63bc536371?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1594744803329-e58b31de8bf5?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1604654894610-df63bc536371?auto=format&fit=crop&q=80&w=1200",
  ],

  // ─── Section Copy ─────────────────────────────────────────────────────────────
  sections: {
    services: {
      title: "Polish & Precision",
      subtitle: "Our Services",
      // ACTION shots — one per service, same order as services[].
      // services[0] Classic Manicure      → technician applying polish
      // services[1] Gel Manicure          → in-session manicure detail
      // services[2] Acrylic Full Set      → sculpted extension result
      // services[3] Nail Art & Bespoke    → artistic nail detail
      // services[4] Luxury Spa Pedicure   → finished pedicure result
      // services[5] Extensions & Infills  → refined manicure finish
      images: [
        "https://images.unsplash.com/photo-1753285310651-6974a839c992?auto=format&fit=crop&q=80&w=600",
        "https://images.unsplash.com/photo-1676926606566-58f2e00b592b?auto=format&fit=crop&q=80&w=600",
        "https://images.unsplash.com/photo-1604654894610-df63bc536371?auto=format&fit=crop&q=80&w=600",
        "https://images.unsplash.com/photo-1519014816548-bf5fe059798b?auto=format&fit=crop&q=80&w=600",
        "https://images.unsplash.com/photo-1707725238063-0c54fb6963d1?auto=format&fit=crop&q=80&w=600",
        "https://images.unsplash.com/photo-1674691412909-8405f0a19940?auto=format&fit=crop&q=80&w=600",
      ],
    },
    team: {
      title: "Beauty & Mastery // v1.0",
      subtitle: "The Artists",
      description:
        "Each technician at Aura Nail Studio was chosen not only for their technical excellence, but for the care and creative intelligence they bring to every client interaction. We are a studio of specialists — three distinct disciplines, one shared standard of perfection.",
    },
    whyChooseUs: {
      title: "The Standard",
      subtitle: "Why Choose Us",
      // Elegant nail studio interior — clean stations, soft lighting, premium detail
      mainImage:
        "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&q=80&w=1000",
      badge: "8 Years\nOf Beauty",
      benefits: [
        {
          iconName: "ShieldCheck",
          title: "Impeccable Hygiene",
          desc: "Every tool is sterilised between clients, single-use implements are disposed of after each session, and all workstations are sanitised to clinical standards. Your safety and peace of mind come first.",
        },
        {
          iconName: "Sparkles",
          title: "Personalized Consultation",
          desc: "Before each service, we align on your style direction, nail goals, and finish preferences in-chair so your final result feels intentional, wearable, and uniquely yours.",
        },
        {
          iconName: "Palette",
          title: "Truly Custom Design",
          desc: "No pre-made templates, no generic nail charts. Every bespoke design at Aura is conceived specifically for you — hand-drawn, hand-painted, and never reproduced.",
        },
        {
          iconName: "Award",
          title: "Premium Products Only",
          desc: "We use only professional-grade, non-toxic gel systems, HEMA-free formulations, and salon-exclusive brands. Your nails' long-term health is as important to us as today's finish.",
        },
      ],
    },
    testimonials: {
      title: "Voices of Trust",
      subtitle: "What Our Clients Say",
    },
    gallery: {
      title: "Artistry in Detail",
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
        "Ready to experience precision nail artistry? Send us a message, share any design references you love, and our team will reach out to schedule your appointment.",
    },
    booking: {
      title: "Book Your Visit",
      tagline:
        "Book your service directly and personalize your look with your technician before your session begins.",
      steps: {
        service: "Service",
        staff: "Technician",
        datetime: "Schedule",
        details: "Confirm",
        payment: "Payment",
      },
      aiConsultant: {
        title: "Nail Intelligence",
        subtitle: "Not Sure Where to Start?",
        description:
          "Describe the look you have in mind and our AI specialist will recommend the right service, technician, and approach — so you arrive at your consultation fully prepared.",
        agentLabel: "Beauty Consultant",
        placeholder:
          "Describe your ideal look (e.g. 'Soft pink almond gel nails with subtle gold detailing')...",
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
        title: "Technician Roster",
        scheduleTitle: "Weekly Studio Window",
        commitButton: "Save Schedule",
        enforcementTitle: "Schedule Enforcement",
        enforcementDesc:
          "Technician schedules are enforced in real time by the booking engine. Changes to weekly hours or blocked days take effect immediately, preventing double-bookings.",
      },
    },
  },
};
