import type { NichePreset } from "../../types";
import { presetThemeEmployment } from "./themes";

export const employmentPresetEn: NichePreset = {
  businessMode: "solo",
  business: {
    type: "employment",
    legalName: "Lekt Grigori - Employment Agency",
    address: "Bialik 44, Ashkelon, Israel",
    cancellationPolicy: "",
  },

  brand: {
    name: "Lekt Grigori",
    tagline: "Connecting People with Work",
    description:
      "Lekt Grigori specializes in placing workers in warehouses, supermarkets, cleaning, logistics, driving, cooking, construction, and more. We're here for you.",
    logoIconName: "Briefcase",
    faviconEmoji: "💼",
    ogImage: "/og-employment.png",
    aiPersona:
      "You are a representative of Lekt Grigori, an Israeli employment agency. Your role is to help job seekers understand the process and direct them to register. Answer warmly and professionally.",
  },

  theme: presetThemeEmployment,

  hero: {
    titlePrefix: "Looking for",
    titleHighlight: "Work?",
    titleSuffix: "We'll find it for you",
    subtitle:
      "Lekt Grigori connects job seekers with positions across Israel. Register now and we'll get back to you within 24 hours.",
    ctaPrimary: "Register Now",
    ctaSecondary: "View Available Jobs",
    backgroundImage:
      "https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=1920&q=80",
    stats: [
      { value: "500+", label: "Workers Placed" },
      { value: "120+", label: "Partner Businesses" },
      { value: "15+", label: "Cities in Israel" },
    ],
  },

  contact: {
    address: {
      street: "Bialik 44",
      district: "Ashkelon",
      cityStateZip: "Ashkelon, Israel",
    },
    phone: "+972-50-123-4567",
    email: "info@lektgrigori.co.il",
    social: {
      instagram: "",
      facebook: "",
      whatsapp: "https://wa.me/972501234567",
    },
  },

  hours: {
    monday: { start: "08:00", end: "18:00" },
    tuesday: { start: "08:00", end: "18:00" },
    wednesday: { start: "08:00", end: "18:00" },
    thursday: { start: "08:00", end: "18:00" },
    friday: { start: "08:00", end: "14:00" },
    saturday: null,
    sunday: { start: "08:00", end: "18:00" },
  },

  services: [],
  staff: [],

  testimonials: [
    {
      name: "David K.",
      title: "Warehouse Worker",
      text: "Within two days of registering I was already working. Highly recommend!",
      rating: 5,
    },
    {
      name: "Alina M.",
      title: "Supermarket Staff",
      text: "The team was very friendly and professional. They found me a job close to home.",
      rating: 5,
    },
    {
      name: "Ahmad R.",
      title: "Delivery Driver",
      text: "Excellent service, everything was fast and simple. Thank you so much!",
      rating: 5,
    },
  ],

  gallery: [],

  sections: {
    services: {
      title: "Our Placement Areas",
      subtitle: "Available Positions",
      images: [],
    },
    team: {
      title: "Our Team",
      subtitle: "Employment Professionals",
      description:
        "The Lekt Grigori team consists of experienced employment specialists who know the Israeli job market inside out. We're here to help you find the right position.",
    },
    whyChooseUs: {
      title: "Why Lekt Grigori?",
      subtitle: "Our Advantages",
      mainImage:
        "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&q=80",
      badge: "10+ Years\nof Experience",
      benefits: [
        {
          iconName: "Zap",
          title: "Fast Placement",
          desc: "We contact you within 24 hours of registration and place workers quickly.",
        },
        {
          iconName: "Shield",
          title: "Verified Employers",
          desc: "All our partner businesses are thoroughly vetted to ensure fair working conditions.",
        },
        {
          iconName: "Globe",
          title: "Multilingual Support",
          desc: "We speak Hebrew, Russian, English, and Arabic — so no one gets left behind.",
        },
        {
          iconName: "MapPin",
          title: "All Over Israel",
          desc: "From Ashkelon to Haifa, we cover the whole country with hundreds of open positions.",
        },
      ],
    },
    testimonials: {
      title: "What People Say",
      subtitle: "Success Stories",
    },
    gallery: {
      title: "",
      subtitle: "",
    },
    location: {
      title: "Find Us",
      subtitle: "Our Office",
    },
    contact: {
      title: "Contact Us",
      subtitle: "We're Here for You",
      description:
        "Have a question? Want to learn more? Send us a message and we'll get back to you promptly.",
    },
    booking: {
      title: "Register",
      tagline: "The Lekt Grigori Registration Process",
      steps: {
        service: "Field",
        staff: "Agent",
        datetime: "Time",
        details: "Details",
        payment: "Confirm",
      },
      aiConsultant: {
        title: "Smart Assistant",
        subtitle: "Have Questions?",
        description:
          "Ask our smart assistant about available positions and the registration process.",
        agentLabel: "Digital Agent",
        placeholder: "E.g. 'I'm looking for warehouse work in Ashkelon'...",
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
        title: "Staff",
        scheduleTitle: "Schedule",
        commitButton: "Save",
        enforcementTitle: "Enforcement",
        enforcementDesc: "",
      },
    },
    faq: {
      title: "Frequently Asked Questions",
      subtitle: "Everything You Need to Know",
      items: [
        {
          question: "How does the registration process work?",
          answer:
            "It's simple! Fill out the short form and we'll contact you within 24 hours to understand what suits you.",
        },
        {
          question: "Is there a fee for job seekers?",
          answer:
            "No! Our service is completely free for job seekers. We are paid by the businesses.",
        },
        {
          question: "What types of jobs are available?",
          answer:
            "Warehouses, supermarkets, cleaning, logistics, drivers, cooking/gastronomy, construction, and more.",
        },
        {
          question: "How quickly can I start working?",
          answer:
            "Many of our partners need workers immediately. After registration, we can often place you within a few days.",
        },
        {
          question: "Do I need work experience?",
          answer:
            "Not necessarily. Many positions don't require prior experience. We'll match you based on your skills and preferences.",
        },
        {
          question: "What areas do you cover?",
          answer:
            "We operate across all of Israel, with a focus on the southern and central regions.",
        },
      ],
    },
    howItWorks: {
      title: "How It Works",
      subtitle: "Three Simple Steps",
      steps: [
        {
          number: "01",
          title: "Register",
          description: "Fill out a quick form with your details and preferences",
          iconName: "UserPlus",
        },
        {
          number: "02",
          title: "We Contact You",
          description:
            "Our team reviews your profile and reaches out via WhatsApp or phone",
          iconName: "MessageCircle",
        },
        {
          number: "03",
          title: "Start Working",
          description: "Get matched with the right job and start earning",
          iconName: "Rocket",
        },
      ],
    },
    jobCategories: {
      title: "Job Fields",
      subtitle: "Choose the area that interests you",
      categories: [
        {
          id: "supermarket",
          label: "Supermarkets",
          iconName: "ShoppingCart",
          description: "Cashiers, stockers, floor staff",
        },
        {
          id: "warehouse",
          label: "Warehouses",
          iconName: "Package",
          description: "Sorting, packing, inventory",
        },
        {
          id: "cleaning",
          label: "Cleaning",
          iconName: "Sparkles",
          description: "Offices, buildings, industrial",
        },
        {
          id: "logistics",
          label: "Logistics",
          iconName: "Truck",
          description: "Loading, shipping, distribution",
        },
        {
          id: "drivers",
          label: "Drivers",
          iconName: "Car",
          description: "Delivery, transport, courier",
        },
        {
          id: "cooking",
          label: "Cooking & Gastronomy",
          iconName: "ChefHat",
          description: "Kitchen staff, prep, catering",
        },
        {
          id: "construction",
          label: "Construction",
          iconName: "HardHat",
          description: "Building, renovation, infrastructure",
        },
        {
          id: "other",
          label: "More Options",
          iconName: "Plus",
          description: "Security, agriculture, hotels and more",
        },
      ],
    },
    employmentForm: {
      title: "Job Registration",
      subtitle: "Fill out the form and we'll get back to you within 24 hours",
      steps: {
        name: {
          title: "What's your name?",
          firstNameLabel: "First Name",
          lastNameLabel: "Last Name",
        },
        city: {
          title: "Where do you live?",
          label: "City",
          placeholder: "Select your city",
        },
        interest: {
          title: "What kind of work interests you?",
        },
        experience: {
          title: "Tell us about yourself",
          experienceLabel: "I have previous work experience",
          availabilityLabel: "Availability",
          driversLicenseLabel: "I have a driver's license",
          languagesLabel: "Languages I speak",
          languages: [
            { id: "he", label: "Hebrew" },
            { id: "ru", label: "Russian" },
            { id: "en", label: "English" },
            { id: "ar", label: "Arabic" },
            { id: "am", label: "Amharic" },
            { id: "fr", label: "French" },
          ],
          availabilityOptions: [
            { id: "fulltime", label: "Full-time" },
            { id: "parttime", label: "Part-time" },
            { id: "flexible", label: "Flexible" },
          ],
        },
        contact: {
          title: "How can we reach you?",
          phoneLabel: "Phone number",
          emailLabel: "Email (optional)",
        },
        summary: {
          title: "Review & Submit",
          submitLabel: "Submit Registration",
          successTitle: "Registration Sent!",
          successMessage:
            "We received your details. Our team will contact you within 24 hours.",
        },
      },
      cities: [
        "אשקלון",
        "באר שבע",
        "אשדוד",
        "תל אביב",
        "ירושלים",
        "חיפה",
        "נתניה",
        "ראשון לציון",
        "פתח תקווה",
        "חולון",
        "בני ברק",
        "רמת גן",
        "הרצליה",
        "כפר סבא",
        "רחובות",
        "לוד",
        "רמלה",
        "קריית גת",
        "עראד",
        "דימונה",
        "אילת",
        "אופקים",
        "שדרות",
        "נתיבות",
      ],
    },
  },
};
