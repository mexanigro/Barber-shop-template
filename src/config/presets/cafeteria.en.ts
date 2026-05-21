import type { NichePreset } from "../../types";
import { presetThemeCafeteria } from "./themes";

export const cafeteriaPresetEn: NichePreset = {
  businessMode: "team",
  business: {
    type: "cafeteria",
    legalName: "Aroma Vivo Coffee LLC",
    address: "Av. del Libertador 2840, Palermo, Buenos Aires, Argentina",
    cancellationPolicy: "24 hours before the reserved time",
  },

  brand: {
    name: "Aroma Vivo",
    tagline: "Specialty coffee roasted in small batches",
    description: "Small-batch specialty coffee roasted with care. Every cup is a ceremony of flavor and craft.",
    logoIconName: "Coffee",
    aiPersona: "You are a virtual barista and coffee expert. Help customers discover our menu, learn about our roasting process, and find the perfect drink for their taste. Always be warm and knowledgeable.",
  },

  theme: presetThemeCafeteria,

  hero: {
    titlePrefix: "Aroma",
    titleHighlight: "Vivo",
    titleSuffix: "Specialty Coffee · Artisan Roasting",
    subtitle: "Every cup tells a story. Let the coffee speak before your first sip.",
    ctaPrimary: "Explore Our Menu",
    ctaSecondary: "Our Process",
    backgroundImage: "https://images.unsplash.com/photo-1445116572660-236099ec97a0?auto=format&fit=crop&q=80&w=2000",
  },

  contact: {
    address: {
      street: "Av. del Libertador 2840",
      district: "Palermo",
      cityStateZip: "Buenos Aires, Argentina",
    },
    phone: "+54 11 4567-8901",
    email: "hello@aromavivo.com",
    social: {
      instagram: "https://instagram.com/aromavivocafe",
      facebook: "https://facebook.com/aromavivocafe",
    },
  },

  hours: {
    monday: { start: "07:00", end: "20:00" },
    tuesday: { start: "07:00", end: "20:00" },
    wednesday: { start: "07:00", end: "20:00" },
    thursday: { start: "07:00", end: "20:00" },
    friday: { start: "07:00", end: "20:00" },
    saturday: { start: "08:00", end: "21:00" },
    sunday: { start: "09:00", end: "18:00" },
  },

  services: [
    { id: "espresso", name: "Classic Espresso", subtitle: "The pure soul", description: "Intense, creamy, and full-bodied. A double shot that reveals the full character of the bean.", duration: 0, price: 0, category: "hot", image: "/images/menu/espresso.jpg" },
    { id: "cappuccino", name: "Soft Cappuccino", subtitle: "Foam cloud", description: "Silky foam over double espresso, with microbubbles that melt on the palate.", duration: 0, price: 0, category: "hot", image: "/images/menu/cappuccino.jpg" },
    { id: "flat-white", name: "Flat White", subtitle: "Liquid silk", description: "Perfect microfoam over double ristretto. A favorite among coffee purists.", duration: 0, price: 0, category: "hot", image: "/images/menu/flatwhite.jpg" },
    { id: "cold-brew", name: "Cold Brew", subtitle: "Iced patience", description: "Twelve-hour cold extraction. Smooth, sweet, and refreshingly clean.", duration: 0, price: 0, category: "cold", image: "/images/menu/coldbrew.jpg" },
    { id: "iced-latte", name: "Iced Latte", subtitle: "Ice and passion", description: "Creamy milk and balanced espresso over ice. Perfectly refreshing.", duration: 0, price: 0, category: "cold", image: "/images/menu/icedlatte.jpg" },
    { id: "frappe-moka", name: "Frappe Moka", subtitle: "Sweet indulgence", description: "Coffee, chocolate, and whipped cream blended into a dessert-style drink.", duration: 0, price: 0, category: "cold", image: "/images/menu/frappemoka.jpg" },
    { id: "tiramisu", name: "Homemade Tiramisu", subtitle: "Layers of joy", description: "Layers of coffee, mascarpone, and cocoa. A perfected family recipe.", duration: 0, price: 0, category: "desserts", image: "/images/menu/tiramisu.jpg" },
    { id: "cheesecake", name: "Caramel Cheesecake", subtitle: "Sweet balance", description: "Biscuit base, cream cheese, and salted caramel sauce.", duration: 0, price: 0, category: "desserts", image: "/images/menu/cheesecake.jpg" },
  ],

  staff: [
    { id: "lucas", slug: "lucas-fernandez", name: "Lucas Fernandez", specialty: "Head Barista & Founder", bio: "Former national latte art champion with 10 years in specialty coffee.", photoUrl: "https://images.unsplash.com/photo-1577219491135-ce391730fb2c?auto=format&fit=crop&q=80&w=800", portfolio: [], schedule: { monday: { isOpen: true, hours: { start: "07:00", end: "20:00" }, breaks: [] }, tuesday: { isOpen: true, hours: { start: "07:00", end: "20:00" }, breaks: [] }, wednesday: { isOpen: true, hours: { start: "07:00", end: "20:00" }, breaks: [] }, thursday: { isOpen: true, hours: { start: "07:00", end: "20:00" }, breaks: [] }, friday: { isOpen: true, hours: { start: "07:00", end: "20:00" }, breaks: [] }, saturday: { isOpen: true, hours: { start: "08:00", end: "21:00" }, breaks: [] }, sunday: { isOpen: false, hours: { start: "09:00", end: "18:00" }, breaks: [] } } },
    { id: "martina", slug: "martina-lopez", name: "Martina Lopez", specialty: "Senior Barista", bio: "Extraction and cold brew specialist with a highly trained palate.", photoUrl: "https://images.unsplash.com/photo-1554151228-14d9def656e4?auto=format&fit=crop&q=80&w=800", portfolio: [], schedule: { monday: { isOpen: true, hours: { start: "07:00", end: "20:00" }, breaks: [] }, tuesday: { isOpen: true, hours: { start: "07:00", end: "20:00" }, breaks: [] }, wednesday: { isOpen: true, hours: { start: "07:00", end: "20:00" }, breaks: [] }, thursday: { isOpen: true, hours: { start: "07:00", end: "20:00" }, breaks: [] }, friday: { isOpen: true, hours: { start: "07:00", end: "20:00" }, breaks: [] }, saturday: { isOpen: true, hours: { start: "08:00", end: "21:00" }, breaks: [] }, sunday: { isOpen: false, hours: { start: "09:00", end: "18:00" }, breaks: [] } } },
    { id: "santiago", slug: "santiago-ruiz", name: "Santiago Ruiz", specialty: "Roaster", bio: "A slow-fire craftsman who treats each roast profile like a piece of art.", photoUrl: "https://images.unsplash.com/photo-1600565193348-f74bd3c7ccdf?auto=format&fit=crop&q=80&w=800", portfolio: [], schedule: { monday: { isOpen: true, hours: { start: "07:00", end: "20:00" }, breaks: [] }, tuesday: { isOpen: true, hours: { start: "07:00", end: "20:00" }, breaks: [] }, wednesday: { isOpen: true, hours: { start: "07:00", end: "20:00" }, breaks: [] }, thursday: { isOpen: true, hours: { start: "07:00", end: "20:00" }, breaks: [] }, friday: { isOpen: true, hours: { start: "07:00", end: "20:00" }, breaks: [] }, saturday: { isOpen: false, hours: { start: "08:00", end: "21:00" }, breaks: [] }, sunday: { isOpen: false, hours: { start: "09:00", end: "18:00" }, breaks: [] } } },
  ],

  testimonials: [
    { name: "Valentina R.", title: "Regular customer", text: "The best espresso I have tried in Buenos Aires. You can tell they choose beans carefully and extract them perfectly.", rating: 5 },
    { name: "Martin L.", title: "Morning regular", text: "I come every morning before work. The Flat White is my religion. The atmosphere makes you want to stay all afternoon.", rating: 5 },
    { name: "Camila S.", title: "Weekend visitor", text: "My partner brought me for the Cold Brew and now we are regulars. The tiramisu is next-level and truly homemade.", rating: 5 },
    { name: "Andres P.", title: "Remote worker", text: "I work remotely and this is my place. Fast Wi-Fi, power outlets, excellent coffee, and a calm vibe you rarely find.", rating: 5 },
    { name: "Sofia M.", title: "New customer", text: "I discovered Aroma Vivo on Google Maps and the photos do not lie. Coffee quality and service exceed expectations.", rating: 5 },
  ],

  gallery: [
    "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&q=80&w=800",
    "https://images.unsplash.com/photo-1442512595331-e89e73853f31?auto=format&fit=crop&q=80&w=800",
    "https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&q=80&w=800",
    "https://images.unsplash.com/photo-1498804103079-a6351b050096?auto=format&fit=crop&q=80&w=800",
  ],

  sections: {
    services: {
      title: "Our Menu",
      subtitle: "Signature creations crafted with care",
      images: [],
    },
    team: {
      title: "Who We Are",
      subtitle: "Hands that craft magic",
      description: "Passionate artisans dedicated to the craft of specialty coffee.",
    },
    whyChooseUs: {
      title: "Our Difference",
      subtitle: "What makes every cup special",
      benefits: [
        { title: "Single-Origin Beans", desc: "We source from top farms in Colombia, Ethiopia, and Brazil.", iconName: "Leaf" },
        { title: "Small-Batch Roasting", desc: "Every batch is hand-roasted for maximum flavor expression.", iconName: "Flame" },
        { title: "Expert Baristas", desc: "Trained palates that calibrate every extraction to perfection.", iconName: "Award" },
        { title: "Calm Atmosphere", desc: "Designed so every visit feels like a deliberate, mindful pause.", iconName: "Sun" },
      ],
      mainImage: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&q=80&w=800",
      badge: "Specialty Coffee",
    },
    testimonials: { title: "What People Are Saying", subtitle: "4.9 on Google Maps" },
    gallery: { title: "Our Space", subtitle: "A refuge for your senses" },
    location: { title: "Visit Us", subtitle: "We are ready with your cup" },
    contact: { title: "Get In Touch", subtitle: "We'd love to hear from you", description: "Whether you have a question about our menu, events, or wholesale coffee, drop us a line." },
    booking: {
      title: "Reserve a Table",
      tagline: "For groups and special events",
      steps: { service: "Event type", staff: "Host", datetime: "Date & time", details: "Your details", payment: "Confirmation" },
      aiConsultant: { title: "Coffee Guide", subtitle: "Not sure what to order?", description: "Our AI barista can recommend the perfect drink based on your taste preferences.", agentLabel: "Barista AI", placeholder: "What kind of coffee do you enjoy?" },
      success: { title: "Reservation Confirmed", confirmed: "We'll have your table ready!", requestSaved: "Your request has been saved.", cancelled: "Reservation cancelled." },
    },
    admin: {
      staff: { title: "Team Management", scheduleTitle: "Schedules", commitButton: "Save changes", enforcementTitle: "Shift Rules", enforcementDesc: "Configure team availability." },
    },
    philosophy: {
      title: "Our Essence",
      subtitle: "More than a cup, a ritual",
      intro: "We believe coffee is a ritual that deserves time, attention, and respect. From bean to cup, every step is a conscious decision toward excellence.",
      pillars: [
        { number: "01", title: "Origin", description: "We source beans from sustainable farms at ideal altitudes and climates to build distinct flavor profiles." },
        { number: "02", title: "Roasting", description: "Each batch is hand-roasted in small lots, preserving the character of every origin without shortcuts." },
        { number: "03", title: "Extraction", description: "Our baristas balance sweetness, acidity, and body to capture the best expression of each bean." },
      ],
    },
    process: {
      title: "From Farm to Cup",
      subtitle: "A mindful process",
      intro: "This is more than coffee. It is a chain of deliberate decisions that respect the bean, the farmer, and the person drinking it.",
      steps: [
        { number: "01", title: "Selection", description: "We choose beans from top farms in Colombia, Ethiopia, and Brazil. Only the top 1% pass our quality filter." },
        { number: "02", title: "Artisan Roasting", description: "Every batch is hand-roasted while temperature and time are monitored with precision." },
        { number: "03", title: "Controlled Rest", description: "Beans rest for 48 hours in a climate-controlled room so oils stabilize and flavors concentrate." },
        { number: "04", title: "Perfect Extraction", description: "Our baristas calibrate temperature, grind, and pressure to extract the best from each origin." },
      ],
    },
    ambience: {
      title: "The Space",
      subtitle: "A refuge for your senses",
      intro: "Designed so every visit feels like a deliberate pause — from the moment you cross the threshold, the pace changes.",
      sectors: [
        { label: "Main Hall", body: "Floor-to-ceiling light washes over pale oak tables and soft banquettes. Nothing competes with the aroma from the bar.", imageSrc: "https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&q=80&w=800" },
        { label: "Coffee Bar", body: "The coffee bar sits at the center — not as a barrier, but as a stage. Watch weighing, grinding, and pouring without feeling rushed.", imageSrc: "https://images.unsplash.com/photo-1453614512568-c4024d13c247?auto=format&fit=crop&q=80&w=800" },
        { label: "Quiet Corners", body: "Around the perimeter, tucked corners with warm lamps welcome laptops, notebooks, or quiet conversation.", imageSrc: "https://images.unsplash.com/photo-1521017432531-fbd92d768814?auto=format&fit=crop&q=80&w=800" },
      ],
    },
    menu: {
      title: "Our Menu",
      subtitle: "Signature creations crafted with care",
      categories: [
        { key: "all", label: "All" },
        { key: "hot", label: "Hot" },
        { key: "cold", label: "Cold" },
        { key: "desserts", label: "Desserts" },
      ],
      items: [
        { id: "espresso", name: "Classic Espresso", subtitle: "The pure soul", description: "Intense, creamy, and full-bodied. A double shot that reveals the full character of the bean.", category: "hot", image: "https://images.unsplash.com/photo-1510707577719-ae7c14805e3a?auto=format&fit=crop&q=80&w=600" },
        { id: "cappuccino", name: "Soft Cappuccino", subtitle: "Foam cloud", description: "Silky foam over double espresso, with microbubbles that melt on the palate.", category: "hot", image: "https://images.unsplash.com/photo-1572442388796-11668a67e53d?auto=format&fit=crop&q=80&w=600" },
        { id: "flat-white", name: "Flat White", subtitle: "Liquid silk", description: "Perfect microfoam over double ristretto. A favorite among coffee purists.", category: "hot", image: "https://images.unsplash.com/photo-1577968897966-3d4325b36b61?auto=format&fit=crop&q=80&w=600" },
        { id: "cold-brew", name: "Cold Brew", subtitle: "Iced patience", description: "Twelve-hour cold extraction. Smooth, sweet, and refreshingly clean.", category: "cold", image: "https://images.unsplash.com/photo-1461023058943-07fcbe16d735?auto=format&fit=crop&q=80&w=600" },
        { id: "iced-latte", name: "Iced Latte", subtitle: "Ice and passion", description: "Creamy milk and balanced espresso over ice. Perfectly refreshing.", category: "cold", image: "https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?auto=format&fit=crop&q=80&w=600" },
        { id: "frappe-moka", name: "Frappe Moka", subtitle: "Sweet indulgence", description: "Coffee, chocolate, and whipped cream blended into a dessert-style drink.", category: "cold", image: "https://images.unsplash.com/photo-1579888944880-d98341245702?auto=format&fit=crop&q=80&w=600" },
        { id: "tiramisu", name: "Homemade Tiramisu", subtitle: "Layers of joy", description: "Layers of coffee, mascarpone, and cocoa. A perfected family recipe.", category: "desserts", image: "https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?auto=format&fit=crop&q=80&w=600" },
        { id: "cheesecake", name: "Caramel Cheesecake", subtitle: "Sweet balance", description: "Biscuit base, cream cheese, and salted caramel sauce.", category: "desserts", image: "https://images.unsplash.com/photo-1533134242443-d4fd215305ad?auto=format&fit=crop&q=80&w=600" },
      ],
    },
    faq: {
      title: "Frequently Asked Questions",
      subtitle: "Good to know before visiting",
      items: [
        { question: "Do you take reservations?", answer: "We're first-come, first-served for regular seating. For groups of 6+, please call ahead." },
        { question: "Do you have vegan/gluten-free options?", answer: "Yes! We have clearly marked options for vegan, vegetarian, and gluten-free diets." },
        { question: "Is there Wi-Fi?", answer: "Free high-speed Wi-Fi is available for all guests. Ask the staff for the password." },
        { question: "Can I bring my laptop and work?", answer: "Absolutely! We have plenty of outlets and a dedicated quiet corner for remote workers." },
      ],
    },
  },
};
