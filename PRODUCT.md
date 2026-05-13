# PRODUCT.md

## Product Purpose

Multi-tenant web platform for local service businesses in Israel. Each deployment is a complete website (landing page + booking system + CRM admin panel) tailored to a specific business niche. The platform runs as a SaaS: Arzac Studio builds and hosts the site, the client uses it daily.

## Register

product

## Users

### Primary: Business Owner / Operator

Local business owner in Israel (barbershop, nail salon, tattoo studio, aesthetics clinic, law firm). Age 25-55, mostly Hebrew-speaking, moderate tech literacy. Uses the CRM daily on a phone or tablet behind the counter. Needs to manage appointments, register walk-in customers, and track business health without friction. Values speed and simplicity over feature depth.

### Secondary: End Customer

The business owner's client. Visits the public landing page to browse services, book an appointment, or chat with the AI assistant. Age 18-60, mobile-first, expects fast load and clear flow. May speak Hebrew or English.

### Tertiary: Arzac Studio (Platform Operator)

Liam. Manages all deployments from nichos-hub. Configures niche presets, deploys client sites, monitors uptime. Needs the template to be zero-config for new tenants.

## Brand & Tone

### Demo Layer (per-niche defaults)

Each niche ships with a complete demo identity: name, tagline, palette, typography, photography direction, AI persona. These demos serve as sales showcases when pitching to prospects. They are polished but generic.

Current niches: barberia, estetica, tattoo, nails, abogado.

### Production Layer (per-client final)

The final deployed site always uses the client's actual branding. Two paths:

1. **Client has branding**: logo, palette, fonts, style guide provided. Applied directly via theme system + preset overrides.
2. **Client lacks branding** (common): Liam researches their Instagram, visits the physical location, photographs signage/interior/vibe, takes notes on atmosphere and clientele. This research package is sent to Claude, who builds a complete visual identity: palette, typography pairing, tone of voice, photography direction, all grounded in the specific niche and the client's unique personality.

### Voice Principles

- Professional but warm. Never corporate.
- Adapted per niche: a barbershop is confident and direct; a nail salon is elegant and inviting; a tattoo studio is bold and authentic.
- CRM copy is functional and fast. No decorative language in admin interfaces.
- Landing page copy sells the experience, not features.

## Anti-references

- Generic SaaS dashboards with identical card grids
- Cookie-cutter Wix/Squarespace service sites
- Over-animated landing pages that prioritize spectacle over booking conversion
- Admin panels that feel like spreadsheets

## Strategic Principles

1. **The CRM is the product.** The landing page gets the first booking; the CRM keeps the business running. Every CRM interaction should be faster than pen-and-paper.
2. **One codebase, infinite personalities.** The template system (presets + themes + tenant config) must support radically different visual identities without forking code.
3. **Mobile-counter reality.** The business owner uses this on a phone wedged next to the cash register. Touch targets, scroll behavior, and information density must respect this context.
4. **AI earns its space.** The chatbot and CRM AI features must deliver real business value (booking conversion, customer insight, schedule optimization), not cosmetic intelligence.
5. **Hebrew-first, English-ready.** RTL is not an afterthought. Every layout, every component, every animation must work in both directions.
6. **Zero-config deploy.** A new client site should go live with only environment variables. No manual Firestore setup, no seed scripts, no migration steps.
