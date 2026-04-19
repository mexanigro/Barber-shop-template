/// <reference types="vite/client" />
import { SiteConfig } from "../types";

export const siteConfig: SiteConfig = {
  brand: {
    name: "ONYX & STEEL",
    tagline: "The Modern Gentleman's Sanctuary",
    description:
      "Book premium grooming and services online. Fully configurable master template — set your brand, team, and services in site config.",
    logoIconName: "Scissors",
    aiPersona:
      "Eres un asistente virtual experto. Tu objetivo es ayudar a los clientes, responder sus dudas de forma breve y recomendar nuestros servicios.",
  },
  features: {
    showWhyChooseUs: false,
    showServices: true,
    showTeam: true,
    showGallery: true,
    showTestimonials: true,
    showInquiry: true,
    showLocation: true,
    showBooking: true,
  },
  hero: {
    titlePrefix: "SHARP",
    titleHighlight: "STYLE",
    titleSuffix: "FOR SHARP MINDS",
    subtitle: "Experience the pinnacle of sophisticated grooming. Where tradition meets high-precision artistry.",
    ctaPrimary: "RESERVE YOUR CHAIR",
    ctaSecondary: "OUR SERVICES",
    backgroundImage: "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&q=80&w=2000",
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
  services: [
    {
      id: "haircut",
      name: "Classic Haircut",
      description: "Precision cut tailored to your style with a hot towel finish.",
      duration: 30,
      price: 45,
    },
    {
      id: "beard-trim",
      name: "Beard Sculpture",
      description: "Expert shaping and line-up with premium beard oil treatment.",
      duration: 20,
      price: 30,
    },
    {
      id: "hair-beard",
      name: "Haircut & Beard",
      description: "The complete grooming experience for the modern gentleman.",
      duration: 50,
      price: 65,
    },
    {
      id: "straight-shave",
      name: "Classic Straight Shave",
      description: "Traditional hot lather shave for skin as smooth as steel.",
      duration: 30,
      price: 40,
    },
  ],
  staff: [
    {
      id: "alex",
      name: "Alex 'The Blade' Reed",
      photoUrl: "https://images.unsplash.com/photo-1598524322298-d7f9733c82ef?auto=format&fit=crop&q=80&w=800",
      specialty: "Classic Fades & Tapers",
      bio: "With over 12 years of experience, Alex specializes in modern skin fades and classic silhouettes.",
      social: {
        instagram: "https://instagram.com/alexblade",
        twitter: "https://twitter.com/alexblade"
      },
      schedule: {
        monday: { isOpen: true, hours: { start: "09:00", end: "18:00" }, breaks: [{ start: "13:00", end: "14:00", label: "Lunch" }] },
        tuesday: { isOpen: true, hours: { start: "09:00", end: "18:00" }, breaks: [{ start: "13:00", end: "14:00", label: "Lunch" }] },
        wednesday: { isOpen: true, hours: { start: "09:00", end: "18:00" }, breaks: [{ start: "13:00", end: "14:00", label: "Lunch" }] },
        thursday: { isOpen: true, hours: { start: "09:00", end: "18:00" }, breaks: [{ start: "13:00", end: "14:00", label: "Lunch" }] },
        friday: { isOpen: true, hours: { start: "09:00", end: "18:00" }, breaks: [{ start: "13:00", end: "14:00", label: "Lunch" }] },
        saturday: { isOpen: true, hours: { start: "10:00", end: "16:00" }, breaks: [] },
        sunday: { isOpen: false, hours: { start: "00:00", end: "00:00" }, breaks: [] },
      }
    },
    {
      id: "daniel",
      name: "Daniel Petrocelli",
      photoUrl: "https://images.unsplash.com/photo-1599351431247-f13b29c4e1d9?auto=format&fit=crop&q=80&w=800",
      specialty: "Beard Artistry & Grooming",
      bio: "Daniel is a master of facial hair, known for his precision with the straight razor and beard contouring.",
      social: {
        instagram: "https://instagram.com/danielgrooming"
      },
      schedule: {
        monday: { isOpen: false, hours: { start: "00:00", end: "00:00" }, breaks: [] },
        tuesday: { isOpen: true, hours: { start: "10:00", end: "19:00" }, breaks: [{ start: "14:00", end: "15:00", label: "Break" }] },
        wednesday: { isOpen: true, hours: { start: "10:00", end: "19:00" }, breaks: [{ start: "14:00", end: "15:00", label: "Break" }] },
        thursday: { isOpen: true, hours: { start: "10:00", end: "19:00" }, breaks: [{ start: "14:00", end: "15:00", label: "Break" }] },
        friday: { isOpen: true, hours: { start: "10:00", end: "19:00" }, breaks: [{ start: "14:00", end: "15:00", label: "Break" }] },
        saturday: { isOpen: true, hours: { start: "10:00", end: "19:00" }, breaks: [{ start: "14:00", end: "15:00", label: "Break" }] },
        sunday: { isOpen: false, hours: { start: "00:00", end: "00:00" }, breaks: [] },
      }
    },
    {
      id: "michael",
      name: "Michael Vane",
      photoUrl: "https://images.unsplash.com/photo-1622286332618-f2803b1950d4?auto=format&fit=crop&q=80&w=800",
      specialty: "Scissor Work & Texture",
      bio: "Michael blends traditional techniques with modern texture work for effortless, stylish looks.",
      social: {
        instagram: "https://instagram.com/michaelvane",
        twitter: "https://twitter.com/michaelvane"
      },
      schedule: {
        monday: { isOpen: true, hours: { start: "09:00", end: "17:00" }, breaks: [{ start: "12:00", end: "13:00", label: "Lunch" }] },
        tuesday: { isOpen: true, hours: { start: "09:00", end: "17:00" }, breaks: [{ start: "12:00", end: "13:00", label: "Lunch" }] },
        wednesday: { isOpen: true, hours: { start: "09:00", end: "17:00" }, breaks: [{ start: "12:00", end: "13:00", label: "Lunch" }] },
        thursday: { isOpen: true, hours: { start: "09:00", end: "17:00" }, breaks: [{ start: "12:00", end: "13:00", label: "Lunch" }] },
        friday: { isOpen: true, hours: { start: "09:00", end: "17:00" }, breaks: [{ start: "12:00", end: "13:00", label: "Lunch" }] },
        saturday: { isOpen: false, hours: { start: "00:00", end: "00:00" }, breaks: [] },
        sunday: { isOpen: false, hours: { start: "00:00", end: "00:00" }, breaks: [] },
      }
    },
  ],
  testimonials: [
    {
      name: "Marcus Thorne",
      title: "CEO, TechSolutions",
      text: "The only place I trust for my weekly fade. Alex is a genuine craftsman. The attention to detail is unmatched in this city.",
      rating: 5,
    },
    {
      name: "Julian Vane",
      title: "Architect",
      text: "Daniel's beard sculptures are art. The straight razor shave is an experience every man should have. Truly premium.",
      rating: 5,
    },
    {
      name: "Elias Reed",
      title: "Photographer",
      text: "Stunning interior, professional staff, and the best haircut I've ever had. They really know how to treat a client.",
      rating: 5,
    },
  ],
  gallery: [
    "https://images.unsplash.com/photo-1585747860715-2ba37e788b70?auto=format&fit=crop&q=80&w=1200", // Shop Interior Atmosphere
    "https://images.unsplash.com/photo-1621605815971-fbc98d665033?auto=format&fit=crop&q=80&w=1200", // Close up fade detail
    "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&q=80&w=1200", // Staff at work
    "https://images.unsplash.com/photo-1512690196236-724d90957dc3?auto=format&fit=crop&q=80&w=1200", // Traditional tools
    "https://images.unsplash.com/photo-1593702295094-172f3e098808?auto=format&fit=crop&q=80&w=1200", // Bearded client detail
    "https://images.unsplash.com/photo-1634449571010-02389ed0f9b0?auto=format&fit=crop&q=80&w=1200", // Modern style cut
    "https://images.unsplash.com/photo-1599351431247-f13b29c4e1d9?auto=format&fit=crop&q=80&w=1200", // Professional profile
    "https://images.unsplash.com/photo-1622286332618-f2803b1950d4?auto=format&fit=crop&q=80&w=1200", // Tool detail
    "https://images.unsplash.com/photo-1532710093739-9470acff878f?auto=format&fit=crop&q=80&w=1200", // Precision work
    "https://images.unsplash.com/photo-1516733725897-1aa73b87c8e8?auto=format&fit=crop&q=80&w=1200", // Razor work
    "https://images.unsplash.com/photo-1501612722-7940219c118d?auto=format&fit=crop&q=80&w=1200", // Interior shot 2
    "https://images.unsplash.com/photo-1503951458645-643d53efd90f?auto=format&fit=crop&q=80&w=1200", // Equipment shot
  ],
  sections: {
    services: {
      title: "Curated Craft",
      subtitle: "Premium Services",
      images: [
        "https://images.unsplash.com/photo-1599351431202-1e0f0137899a?auto=format&fit=crop&q=80&w=600",
        "https://images.unsplash.com/photo-1621605815971-fbc98d665033?auto=format&fit=crop&q=80&w=600",
        "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&q=80&w=600",
        "https://images.unsplash.com/photo-1585747860715-2ba37e788b70?auto=format&fit=crop&q=80&w=600",
      ]
    },
    team: {
      title: "Personnel Directory // v1.0",
      subtitle: "Meet Our Legends",
      description: "Our roster consists of multi-disciplined artists, hand-selected for their technical precision and commitment to the architectural integrity of the modern male silhouette."
    },
    whyChooseUs: {
      title: "The Standard",
      subtitle: "Why Choose Us",
      mainImage: "https://images.unsplash.com/photo-1542646351-4122d21a2886?auto=format&fit=crop&q=80&w=1000",
      badge: "10 Years\nOf Mastery",
      benefits: [
        {
          iconName: "ShieldCheck",
          title: "Highest Hygiene",
          desc: "Hospital-grade sterilization of all tools after every single client. Your safety is our mandate.",
        },
        {
          iconName: "Clock",
          title: "Swiss Punctuality",
          desc: "We respect your busy schedule. We start on time, every time. No waiting lists, no excuses.",
        },
        {
          iconName: "Award",
          title: "Master Craft",
          desc: "Our staff go through rigorous training and certifications to handle all client needs and styles.",
        },
        {
          iconName: "Zap",
          title: "Sharp Results",
          desc: "Precision isn't a goal, it's our standard. We don't stop until every edge is perfect.",
        },
      ]
    },
    testimonials: {
      title: "Voices of Trust",
      subtitle: "What Our Clients Say"
    },
    gallery: {
      title: "Visual Mastery",
      subtitle: "The Portfolio"
    },
    location: {
      title: "Visit Us",
      subtitle: "Locate The Chair"
    },
    contact: {
      title: "Get In Touch",
      subtitle: "Send Us An Inquiry",
      description: "Have a special request or a question? Drop us a line and the team will get back to you shortly."
    },
    booking: {
      title: "Book Appointment",
      tagline: "The Modern Gentleman's Sanctuary Experience",
      steps: {
        service: "Service",
        staff: "Staff",
        datetime: "Time",
        details: "Confirm",
        payment: "Payment"
      },
      aiConsultant: {
        title: "Neural Intelligence",
        subtitle: "Need Style Precision?",
        description: "Ask our AI specialist to recommend your next mission.",
        agentLabel: "Consulting Agent",
        placeholder: "Describe your vision (e.g. 'Tactical low-fade with beard sync')..."
      },
      success: {
        title: "Success",
        confirmed: "Confirmed!",
        requestSaved: "Request Saved!",
        cancelled: "Cancelled"
      }
    },
    admin: {
      staff: {
        title: "Tactical Personnel",
        scheduleTitle: "Weekly Operational Window",
        commitButton: "Commit Schedule",
        enforcementTitle: "Temporal Enforcement Protocol",
        enforcementDesc: "Personnel schedules are strictly enforced by the booking core. Any changes to weekly windows or inactive days will instantly propagate to the frontend terminal, preventing impossible mission allocations."
      }
    }
  },
  payment: {
    enabled: false, // Set true when Stripe (and ENV) are configured
    mode: 'none', // 'none' | 'deposit' | 'full' — template default: cardless / free booking flow
    depositAmount: 2000, // $20.00 if using deposit mode
    currency: 'usd',
    stripePublishableKey: import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || "",
  },
  
  /**
   * NOTIFICATION CONFIGURATION
   * 
   * This section prepares the site to send alerts directly to the business owner.
   * To activate, the following values must be added to the Environment Secrets:
   * 
   * 1. BUSINESS_OWNER_EMAIL    -> The main recipient for all alerts
   * 2. EMAIL_FROM_ADDRESS       -> The verified "send-from" address
   * 3. EMAIL_PROVIDER_API_KEY   -> Your API key (e.g., Resend, SendGrid)
   */
  notifications: {
    enabled: true,           // Master toggle for notifications
    bookingAlerts: true,     // Send email for new bookings
    contactInquiries: true,  // Send email for contact/inquiry forms
  },
  adminEmail: import.meta.env.VITE_ADMIN_EMAIL || "",
};
