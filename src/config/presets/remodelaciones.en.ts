import type { NichePreset } from "../../types";
import { presetThemeRemodelaciones } from "./themes";

export const remodelacionesPresetEn: NichePreset = {
  businessMode: "team",
  business: {
    type: "remodelaciones",
    legalName: "BrushCraft Painting Pty Ltd",
    address: "Sydney, NSW, Australia",
    cancellationPolicy: "48 hours before the scheduled start date",
  },

  brand: {
    name: "BrushCraft",
    tagline: "Professional house painting across Sydney",
    description: "Professional interior and exterior painting services. Licensed, insured, and backed by a quality guarantee. Get a free quote today.",
    logoIconName: "Paintbrush",
    faviconEmoji: "🏠",
    aiPersona: "You are a virtual consultant for a professional painting company. Help customers understand our services, get quotes, and learn about our process. Be professional, knowledgeable, and helpful.",
  },

  theme: presetThemeRemodelaciones,

  hero: {
    titlePrefix: "WE TRANSFORM",
    titleHighlight: "YOUR HOME",
    titleSuffix: "WITH A PERFECT FINISH",
    subtitle: "Interior and exterior painting for homes and businesses. Licensed, insured, and backed by a quality guarantee.",
    ctaPrimary: "GET A FREE QUOTE",
    ctaSecondary: "VIEW OUR WORK",
    backgroundImage: "https://images.unsplash.com/photo-1774977737078-7ccc2ac697e6?auto=format&fit=crop&q=80&w=2000",
    variant: "slider",
    beforeImage: "https://images.unsplash.com/photo-1717281234297-3def5ae3eee1?auto=format&fit=crop&q=80&w=1600",
    afterImage: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&q=80&w=1600",
    stats: [
      { value: "500+", label: "Homes painted" },
      { value: "15+", label: "Years experience" },
      { value: "100%", label: "Satisfaction rate" },
    ],
  },

  contact: {
    address: {
      street: "42 Painter's Lane",
      district: "Inner West",
      cityStateZip: "Sydney, NSW 2000",
    },
    phone: "+61 4XX XXX XXX",
    email: "hello@brushcraftpainting.com.au",
    social: {
      instagram: "https://instagram.com/brushcraftpainting",
      facebook: "https://facebook.com/brushcraftpainting",
    },
  },

  hours: {
    monday: { start: "07:00", end: "17:00" },
    tuesday: { start: "07:00", end: "17:00" },
    wednesday: { start: "07:00", end: "17:00" },
    thursday: { start: "07:00", end: "17:00" },
    friday: { start: "07:00", end: "16:00" },
    saturday: { start: "08:00", end: "13:00" },
    sunday: null,
  },

  services: [
    { id: "consultation", name: "Free Consultation", description: "We visit your property, discuss colours, and provide a detailed written quote. No obligation.", duration: 60, price: 0, fromPrice: "FREE", popular: true, features: ["On-site colour consultation", "Written quote within 24 hours", "No obligation, no pressure", "Expert advice on paints and finishes"] },
    { id: "interior", name: "Interior Painting", description: "Full interior painting including walls, ceilings, trim, and feature walls with premium paints.", duration: 0, price: 1200, fromPrice: "$1,200", features: ["Walls and ceilings", "Skirting boards and trim", "Feature and accent walls", "Colour consultation included"] },
    { id: "exterior", name: "Exterior Painting", description: "Complete exterior painting with weather-resistant coatings for lasting protection.", duration: 0, price: 2500, fromPrice: "$2,500", features: ["Full exterior walls", "Fascia, eaves and gutters", "Window frames and doors", "Weather-resistant coatings"] },
    { id: "deck-fence", name: "Deck & Fence Staining", description: "Timber deck staining and fence painting with UV and weather protection.", duration: 0, price: 800, fromPrice: "$800", features: ["Timber deck staining", "Fence painting and staining", "Pressure washing included", "UV and weather protection"] },
  ],

  staff: [
    { id: "lead-painter", slug: "lead-painter", name: "Lead Painter", specialty: "Project Manager", bio: "15+ years experience in residential and commercial painting.", photoUrl: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&q=80&w=800", portfolio: [], schedule: { monday: { isOpen: true, hours: { start: "07:00", end: "17:00" }, breaks: [] }, tuesday: { isOpen: true, hours: { start: "07:00", end: "17:00" }, breaks: [] }, wednesday: { isOpen: true, hours: { start: "07:00", end: "17:00" }, breaks: [] }, thursday: { isOpen: true, hours: { start: "07:00", end: "17:00" }, breaks: [] }, friday: { isOpen: true, hours: { start: "07:00", end: "16:00" }, breaks: [] }, saturday: { isOpen: false, hours: { start: "08:00", end: "13:00" }, breaks: [] }, sunday: { isOpen: false, hours: { start: "09:00", end: "17:00" }, breaks: [] } } },
  ],

  testimonials: [
    { name: "Sarah M.", title: "Homeowner, Bondi", text: "Absolutely brilliant job on our exterior. The team was punctual, clean, and the finish is flawless. Highly recommend!", rating: 5 },
    { name: "James W.", title: "Homeowner, Newtown", text: "They painted our whole interior in four days without any fuss. Professional, fast, and great colour advice.", rating: 5 },
    { name: "Linda T.", title: "Property manager, Chatswood", text: "We use BrushCraft for all our rental repaints. Reliable, fairly priced, and the tenants always love the results.", rating: 5 },
  ],

  gallery: [
    "https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?auto=format&fit=crop&q=80&w=800",
    "https://images.unsplash.com/photo-1600573472591-ee6b68d14c68?auto=format&fit=crop&q=80&w=800",
    "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&q=80&w=800",
    "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&q=80&w=800",
  ],

  sections: {
    services: {
      title: "Our Services",
      subtitle: "Professional painting solutions for every project",
      images: [
        "https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&q=80&w=800",
        "https://images.unsplash.com/photo-1556909172-54557c7e4fb7?auto=format&fit=crop&q=80&w=800",
        "https://images.unsplash.com/photo-1778342259272-142fa3f81859?auto=format&fit=crop&q=80&w=800",
        "https://images.unsplash.com/photo-1600585154363-67eb9e2e2099?auto=format&fit=crop&q=80&w=800",
      ],
    },
    team: {
      title: "Our Team",
      subtitle: "Licensed and experienced painters",
      description: "Our team of skilled painters brings years of experience and attention to detail to every project.",
    },
    whyChooseUs: {
      title: "Why Choose Us",
      subtitle: "Quality you can trust",
      benefits: [
        { title: "Licensed & Insured", desc: "Fully licensed and insured for your peace of mind.", iconName: "Shield" },
        { title: "Premium Paints", desc: "We use only premium Dulux and Taubmans paints on every job.", iconName: "Droplets" },
        { title: "Meticulous Prep", desc: "Fill, sand, prime — proper preparation for a lasting finish.", iconName: "Hammer" },
        { title: "On Time & Budget", desc: "We respect your schedule and deliver as quoted.", iconName: "Clock" },
        { title: "Clean Worksite", desc: "We treat your property like our own — clean every day.", iconName: "Sparkles" },
        { title: "Quality Guarantee", desc: "Written workmanship guarantee on all our work.", iconName: "Award" },
      ],
      mainImage: "https://images.unsplash.com/photo-1600585154526-990dced4db0d?auto=format&fit=crop&q=80&w=800",
      badge: "Licensed Painters",
    },
    testimonials: { title: "What Our Clients Say", subtitle: "5.0 on Google Reviews" },
    gallery: { title: "Our Work", subtitle: "Before and after transformations" },
    location: { title: "Service Area", subtitle: "Sydney and greater NSW" },
    contact: { title: "Get a Quote", subtitle: "Free, no-obligation estimates", description: "Tell us about your project and we'll provide a detailed quote within 24 hours." },
    booking: {
      title: "Book a Consultation",
      tagline: "Free on-site colour consultation",
      steps: { service: "Service type", staff: "Consultant", datetime: "Preferred date", details: "Your details", payment: "Confirmation" },
      aiConsultant: { title: "Project Advisor", subtitle: "Not sure what you need?", description: "Our AI advisor can help you understand what services suit your project.", agentLabel: "Advisor AI", placeholder: "Describe your painting project..." },
      success: { title: "Consultation Booked", confirmed: "We'll be in touch to confirm!", requestSaved: "Your request has been saved.", cancelled: "Booking cancelled." },
    },
    admin: {
      staff: { title: "Team Management", scheduleTitle: "Schedules", commitButton: "Save changes", enforcementTitle: "Availability", enforcementDesc: "Configure team availability." },
    },
    process: {
      title: "How We Work",
      subtitle: "Our proven 4-step process",
      steps: [
        { number: "01", title: "Free Consultation", description: "We visit your property, discuss colours, and provide a detailed written quote. No obligation.", iconName: "MessageCircle" },
        { number: "02", title: "Prep and Protect", description: "We mask, sand, fill cracks, and prime surfaces so the paint adheres perfectly.", iconName: "ClipboardList" },
        { number: "03", title: "Paint and Transform", description: "Our experienced painters apply premium paints with precision: clean lines, even coverage.", iconName: "Paintbrush" },
        { number: "04", title: "Final Walkthrough", description: "We inspect every detail with you and only leave when you're 100% happy.", iconName: "CheckCircle" },
      ],
    },
    portfolio: {
      title: "Our Projects",
      subtitle: "Recent transformations across Sydney",
      filters: [
        { key: "all", label: "All" },
        { key: "interior", label: "Interior" },
        { key: "exterior", label: "Exterior" },
      ],
      projects: [
        {
          title: "Weatherboard Home, Bondi", type: "Exterior repaint", description: "Complete exterior repaint of a classic weatherboard home. Stripped peeling paint, filled cracks, primed bare timber, and applied two coats of weather-resistant paint.", duration: "5 days", size: "220 m²", filter: "exterior",
          images: ["https://images.unsplash.com/photo-1568605114967-8130f3a36994?auto=format&fit=crop&q=80&w=800"],
          gallery: [
            { before: "https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?auto=format&fit=crop&q=80&w=600", after: "https://images.unsplash.com/photo-1568605114967-8130f3a36994?auto=format&fit=crop&q=80&w=600", caption: "Front facade" },
            { before: "https://images.unsplash.com/photo-1459767129954-1b1c1f9b9ace?auto=format&fit=crop&q=80&w=600", after: "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&q=80&w=600", caption: "Side elevation" },
          ],
        },
        {
          title: "Cottage, Surry Hills", type: "Interior makeover", description: "Full interior repaint: walls, ceilings, skirting boards, and door frames in a modern neutral palette with low-VOC paint.", duration: "4 days", size: "150 m²", filter: "interior",
          images: ["https://images.unsplash.com/photo-1600210492493-0946911123ea?auto=format&fit=crop&q=80&w=800"],
          gallery: [
            { before: "https://images.unsplash.com/photo-1717281234297-3def5ae3eee1?auto=format&fit=crop&q=80&w=600", after: "https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?auto=format&fit=crop&q=80&w=600", caption: "Living room" },
            { before: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&q=80&w=600", after: "https://images.unsplash.com/photo-1600566752355-35792bedcfea?auto=format&fit=crop&q=80&w=600", caption: "Kitchen area" },
          ],
        },
        {
          title: "Family Home, Parramatta", type: "Full exterior", description: "Large two-storey home. Pressure-washed, sealed hairline cracks, and applied premium paint in a modern grey palette with white trim.", duration: "6 days", size: "310 m²", filter: "exterior",
          images: ["https://images.unsplash.com/photo-1574359411659-15573a27fd0c?auto=format&fit=crop&q=80&w=800"],
          gallery: [
            { before: "https://images.unsplash.com/photo-1767022518702-5cbf807163ec?auto=format&fit=crop&q=80&w=600", after: "https://images.unsplash.com/photo-1759406066673-f76869a4e6db?auto=format&fit=crop&q=80&w=600", caption: "Street view" },
          ],
        },
        {
          title: "Beachside Villa, Manly", type: "Exterior and deck", description: "Full exterior repaint plus timber deck staining with salt-resistant, UV-stable coatings rated for coastal conditions.", duration: "7 days", size: "400 m²", filter: "exterior",
          images: ["https://images.unsplash.com/photo-1742900280864-bcc27353ceba?auto=format&fit=crop&q=80&w=800"],
          gallery: [
            { before: "https://images.unsplash.com/photo-1776871293001-3e44d160564b?auto=format&fit=crop&q=80&w=600", after: "https://images.unsplash.com/photo-1594468243943-c031c526dbc7?auto=format&fit=crop&q=80&w=600", caption: "Exterior and deck" },
          ],
        },
        {
          title: "Renovation, Marrickville", type: "Interior and exterior", description: "Post-renovation paint throughout a newly extended home. Coordinated interior feature walls with exterior render colour.", duration: "8 days", size: "260 m²", filter: "interior",
          images: ["https://images.unsplash.com/photo-1613545325278-f24b0cae1224?auto=format&fit=crop&q=80&w=800"],
          gallery: [
            { before: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&q=80&w=600", after: "https://images.unsplash.com/photo-1600607687644-c7171b42498f?auto=format&fit=crop&q=80&w=600", caption: "Main living area" },
            { before: "https://images.unsplash.com/photo-1448630360428-65456885c650?auto=format&fit=crop&q=80&w=600", after: "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&q=80&w=600", caption: "Kitchen refresh" },
          ],
        },
      ],
    },
    faq: {
      title: "Frequently Asked Questions",
      subtitle: "Common questions about our services",
      items: [
        { question: "How long does a typical project take?", answer: "Timelines vary by scope. A single room takes 3-5 days, full renovations 2-6 weeks." },
        { question: "Do you provide free estimates?", answer: "Yes! We offer free on-site consultations and detailed quotes at no obligation." },
        { question: "Are you licensed and insured?", answer: "Fully licensed and insured. We provide certificates upon request." },
        { question: "Do I need to move out during renovations?", answer: "For most projects, no. We work section by section and clean up daily." },
      ],
    },
  },
};
