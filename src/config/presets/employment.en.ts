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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ...({
      business: {
        hero: {
          eyebrow: "For Businesses",
          titleLine1: "Verified workers,",
          titleHighlight: "no hiring headache",
          subtitle:
            "Stay focused on your work. We screen, interview and deliver matched candidates in under 48 hours — anywhere in Israel.",
          ctaPrimary: "Start hiring",
          ctaSecondary: "See how it works",
          stats: [
            { value: "500+", label: "Workers available" },
            { value: "120+", label: "Partner businesses" },
            { value: "48h", label: "Avg. time to match" },
            { value: "15+", label: "Cities covered" },
          ],
        },
        benefits: {
          eyebrow: "Why work with us",
          title: "The model that gives you your time back",
          benefits: [
            { iconName: "Clock", label: "01", title: "Candidates in 48 hours", description: "Skip the phone marathon. We start screening the moment you submit and show you 3–5 matched candidates within two days." },
            { iconName: "ShieldCheck", label: "02", title: "Vetted one by one", description: "Every worker passes our personal interview, ID and reference check. You never meet raw applicants." },
            { iconName: "MapPin", label: "03", title: "Nationwide coverage", description: "From Ashkelon to Haifa — active worker database across all major industrial, service and construction zones." },
            { iconName: "Headphones", label: "04", title: "A dedicated account manager", description: "One named person owns your account. They answer WhatsApp, handle urgencies and manage replacements." },
            { iconName: "Wallet", label: "05", title: "Pay on success only", description: "No retainer, no subscription, no surprise fees. You pay when the candidate starts working." },
            { iconName: "Layers", label: "06", title: "Flexible structures", description: "Full-time, part-time, project-based or sick-day replacements — we shape the engagement to your business." },
          ],
        },
        workers: {
          eyebrow: "Active categories",
          title: "Workers waiting for the right shift",
          sub: "All categories are live right now. Numbers refresh every morning.",
          categories: [
            { id: "supermarket", label: "Supermarkets", iconName: "ShoppingCart", count: "82 available", description: "Cashiers, shelf stockers, floor crew." },
            { id: "warehouse", label: "Warehouses", iconName: "Package", count: "95 available", description: "Sorting, packing, inventory, pickers." },
            { id: "cleaning", label: "Cleaning", iconName: "Sparkles", count: "120 available", description: "Offices, buildings, industrial." },
            { id: "logistics", label: "Logistics", iconName: "Truck", count: "60 available", description: "Loading, unloading, regional distribution." },
            { id: "drivers", label: "Drivers", iconName: "Car", count: "44 available", description: "Deliveries, transport, couriers." },
            { id: "cooking", label: "Kitchen & catering", iconName: "ChefHat", count: "38 available", description: "Sous chef, prep, hot line." },
            { id: "construction", label: "Construction", iconName: "HardHat", count: "70 available", description: "Building, finishing, infrastructure." },
            { id: "other", label: "More fields", iconName: "Plus", count: "Open demand", description: "Security, agriculture, hospitality." },
          ],
        },
        process: {
          eyebrow: "A 3-step process",
          title: "From request to working team in a week",
          steps: [
            { number: "01", iconName: "ClipboardList", title: "Tell us what you need", description: "A short form, or a 10-minute call. Role, count, area, urgency — that's it." },
            { number: "02", iconName: "Users", title: "Receive matched candidates", description: "Within 48 hours, 3–5 screened candidates. No random résumés — only fits." },
            { number: "03", iconName: "Rocket", title: "Get them working", description: "You pick the right person, we close the paperwork, the worker starts on your schedule." },
          ],
        },
        form: {
          eyebrow: "Start hiring",
          title: "Tell us about the team you need",
          sub: "We respond the same business day with candidate options. No commitment.",
          fields: {
            companyName: "Company name",
            contactName: "Contact name",
            phone: "Phone",
            email: "Email",
            jobType: "Type of workers",
            jobTypePlaceholder: "Select a field",
            workerCount: "How many workers",
            workerCountPlaceholder: "e.g. 5",
            city: "City / region",
            cityPlaceholder: "e.g. Ashkelon",
            urgency: "When to start",
            notes: "Anything else",
            notesPlaceholder: "Role specifics, hours, special requirements…",
          },
          urgencyOptions: [
            { id: "immediate", label: "Immediate" },
            { id: "week", label: "Within a week" },
            { id: "month", label: "Within a month" },
            { id: "flexible", label: "Flexible" },
          ],
          submit: "Send request",
          submitting: "Sending…",
          successTitle: "Request received",
          successMessage: "A dedicated account manager will get back to you within business hours.",
          errorMessage: "Something went wrong. Try again or call us directly.",
        },
        testimonials: {
          eyebrow: "What our businesses say",
          title: "Closing roles instead of having meetings",
          items: [
            { quote: "Our staffing needs shifted overnight — 7 workers in 4 days. Lekt Grigori sent 12 candidates. We hired them all.", author: "Anat L.", role: "Ops Manager, Ashdod logistics warehouse" },
            { quote: "I run a supermarket in Kiryat Gat. I used to waste money on ads. Here I get a ready candidate 48 hours after the call.", author: "Yossi A.", role: "Branch manager, supermarket" },
            { quote: "What I loved most: they didn't waste my time. Every candidate I met was relevant. That's rare.", author: "Vlad K.", role: "Construction site manager, Centre" },
          ],
        },
        faq: {
          eyebrow: "Employer FAQ",
          title: "Everything businesses ask",
          items: [
            { question: "When do I pay?", answer: "Only when a worker we sent starts working. No search fee, no subscription, no candidate fee." },
            { question: "What if the candidate doesn't work out?", answer: "In the first month we replace any worker at no additional cost." },
            { question: "Do you handle paperwork?", answer: "Yes. Contracts, documentation, insurance and payslips — you get one invoice." },
            { question: "How fast can we start?", answer: "Depends on urgency. For urgent roles we've delivered 5+ workers in 48 hours. Usually a full team is ready in a week." },
            { question: "What regions do you cover?", answer: "The whole country — south, centre, north. Most of our activity is in the south district and the centre." },
            { question: "What about foreign workers?", answer: "We have a multilingual database: Hebrew, Russian, English, Arabic. Every worker has legal status to work in Israel." },
          ],
        },
      },
    } as any),
  },
};
