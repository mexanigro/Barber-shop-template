/**
 * Auditoría visual 2026-06-11 — fixes de contenido por config (db "default").
 * Cada fix corrige un hallazgo del triage (idioma mezclado, leaks del preset,
 * imágenes incoherentes, datos placeholder). Solo escribe campos puntuales.
 */
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { readFileSync } = require('fs');
const path = require('path');

const serviceAccount = JSON.parse(
  readFileSync(path.join(__dirname, '..', 'serviceAccountKey.json'), 'utf8')
);
const app = initializeApp({ credential: cert(serviceAccount) }, 'audit-apply-fixes');
const db = getFirestore(app, 'default');

const galleryUrl = (cfg, fileName) =>
  (cfg.gallery || []).find((u) => decodeURIComponent(String(u)).includes(fileName));

async function run() {
  const log = [];

  // ── 1. ONYX & STEEL (demo barbería master) ───────────────────────────────
  {
    const ref = db.doc('config/client_barber_01');
    await ref.update({
      'contact.email': 'hello@onyxandsteel.com',
      'contact.phone': '+1 (212) 555-0147',
      'payment.currency': 'USD',
    });
    log.push('client_barber_01: email demo (saca liam.arzac@gmail.com), phone US, currency USD');
  }

  // ── 2. Estética prueba ────────────────────────────────────────────────────
  {
    const ref = db.doc('config/demo-estetica-prueba-mpfvpl5u');
    await ref.update({
      'brand.tagline': 'מטפלים בשפתיים, בעצמות הלחיים, בפנים ובעור',
      'serviceOverrides.lip-filler.name': 'מילוי שפתיים',
      'serviceOverrides.lip-filler.description':
        'הגדלה ועיצוב שפתיים בחומצה היאלורונית פרימיום. תוצאה טבעית שמחזיקה לאורך זמן.',
      'contact.address.district': '',
      'features.showBeforeAfter': false,
    });
    log.push('estetica-prueba: tagline+lip-filler en hebreo, district vacío, beforeAfter off');
  }

  // ── 3. Gooli Ink ──────────────────────────────────────────────────────────
  {
    const ref = db.doc('config/demo-gooli-ink');
    const cfg = (await ref.get()).data();
    const ig = (cfg.sections.instagram.images || []).map((u) => {
      const n = decodeURIComponent(u);
      if (n.includes('01-japanese-sleeve-wabori')) return galleryUrl(cfg, '08-red-chrysanthemum-hip') || u;
      if (n.includes('04-dragon-sword-ryuken')) return galleryUrl(cfg, '10-spring-dragon-haruno') || u;
      return u;
    });
    const gallery = (cfg.gallery || []).filter(
      (u) => !decodeURIComponent(String(u)).includes('09-snake-she-thigh')
    );
    await ref.update({
      'sections.team.title': 'האמן',
      'staff': cfg.staff.map((s, i) =>
        i === 0 ? { ...s, specialty: 'אירזומי — סגנון יפני מסורתי' } : s),
      'sections.instagram.images': ig,
      'gallery': gallery,
    });
    log.push('gooli: team title singular, specialty hebreo, IG sin captions cortados, snake china fuera de gallery');
  }

  // ── 4. Igal Tattz ─────────────────────────────────────────────────────────
  {
    const ref = db.doc('config/demo-igal-tattz');
    const cfg = (await ref.get()).data();
    const svcImgs = (cfg.sections.services.images || []).map((u) =>
      u.includes('photo-1605647533135') ? (galleryUrl(cfg, '10-coiling-dragon') || u) : u);
    await ref.update({
      'staff': cfg.staff.map((s, i) =>
        i === 0 ? { ...s, specialty: 'פוינטיליזם וריאליזם' } : s),
      'sections.services.images': svcImgs,
    });
    log.push('igal: specialty hebreo, foto fumando reemplazada por obra propia');
  }

  // ── 5. Future Tattoo (legacy) ─────────────────────────────────────────────
  {
    const ref = db.doc('config/demo-future-tattoo');
    const cfg = (await ref.get()).data();
    await ref.update({
      'contact.address.district': '',
      'contact.address.cityStateZip': 'ראשון לציון, ישראל',
      'branding.fonts.display': 'Rubik',
      'sections.whyChooseUs.mainImage': galleryUrl(cfg, '02-geometric-back-piece') || FieldValue.delete(),
      'sections.whyChooseUs.badge': 'אמנות על העור',
    });
    log.push('future-tattoo: dirección IL, display font con glifos hebreos (Rubik), WCU con obra propia, badge con texto');
  }

  // ── 6. Marganink ──────────────────────────────────────────────────────────
  {
    const ref = db.doc('config/demo-marganink');
    const cfg = (await ref.get()).data();
    const teamDesc = String(cfg.sections.team.description || '')
      .replace(/שאני יוצר(?!ת)/g, 'שאני יוצרת')
      .replace(/אני מאמין(?!ה)/g, 'אני מאמינה');
    const svcImgs = (cfg.sections.services.images || []).map((u) => {
      const n = decodeURIComponent(String(u));
      if (n.includes('svc-fine-line')) return galleryUrl(cfg, '04-star-dots-shoulder') || u;
      if (n.includes('svc-japanese')) return galleryUrl(cfg, '09-koi-fish-japan') || u;
      return u;
    });
    await ref.update({
      'contact.address': { street: 'סטודיו פרטי', district: '', cityStateZip: 'תל אביב, ישראל' },
      'hero.stats': [
        { value: '500+', label: 'לקוחות מרוצים' },
        { value: '5.0', label: 'דירוג ממוצע' },
        { value: '100%', label: 'עיצוב אישי' },
      ],
      'sections.team.title': 'האמנית',
      'sections.team.description': teamDesc,
      'sections.services.images': svcImgs,
      'sections.whyChooseUs.mainImage': galleryUrl(cfg, '01-japan-tree') || cfg.sections.whyChooseUs.mainImage,
    });
    log.push('marganink: dirección TLV (sin LA), stats solo-artist, género femenino, imágenes fine-line/japonés coherentes, WCU obra propia');
  }

  // ── 7. Café Aristano ──────────────────────────────────────────────────────
  {
    const ref = db.doc('config/demo-cafe-aristano-mpfwjz7c');
    await ref.update({
      'brand.tagline': 'קפה ארטיזנלי ורגעים אלגנטיים',
      'hero.titlePrefix': 'קפה',
      'hero.titleHighlight': 'אריסטנו',
      'hero.titleSuffix': 'קלייה אומנותית · מנות קטנות',
      'sections.testimonials.title': 'מה אומרים עלינו',
      'hours.sunday': { start: '07:00', end: '22:00' },
      'features.showTeam': false,
      'features.showGallery': false,
      'sections.whyChooseUs.benefits': [
        { iconName: 'Coffee', title: 'קלייה בעבודת יד', desc: 'פולים נבחרים נקלים אצלנו במנות קטנות — טריות שמרגישים בכל כוס.' },
        { iconName: 'Leaf', title: 'חומרי גלם מקומיים', desc: 'חלב ממחלבות קטנות ומאפים שנאפים כל בוקר במקום.' },
        { iconName: 'Award', title: 'בריסטות מוסמכים', desc: 'צוות עם הכשרה מקצועית ותשוקה אמיתית לקפה מדויק.' },
        { iconName: 'Heart', title: 'אווירה שמרגישה בית', desc: 'מרחב שקט ומעוצב לפגישות, לעבודה או לרגע של שקט.' },
      ],
    });
    log.push('cafe-aristano: hero con la marca real, tagline hebreo, rating unificado, domingo abierto, team/gallery off, WCU con 4 beneficios');
  }

  // ── 8. Pinturería El Paolo ────────────────────────────────────────────────
  {
    const ref = db.doc('config/demo-pintureria-el-paolo-mpfwkvuh');
    await ref.update({
      'sections.services.images': [
        'https://images.unsplash.com/photo-1525909002-1b05e0c869d8?w=600&fit=crop&q=80',
        'https://images.unsplash.com/photo-1600054648630-e10e710825f6?w=600&fit=crop&q=80',
        'https://images.unsplash.com/photo-1523217582562-09d0def993a6?w=600&fit=crop&q=80',
        'https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=600&fit=crop&q=80',
      ],
      'contact.address': { street: 'ההסתדרות 15', district: '', cityStateZip: 'פתח תקווה' },
    });
    log.push('pintureria: servicios = [rodillos, interior, exterior-villa, porche-madera] (verificadas), dirección en hebreo');
  }

  // ── 9. Santi ──────────────────────────────────────────────────────────────
  {
    const ref = db.doc('config/demo-santi-mq3luclw');
    await ref.update({ 'splash.variant': 1 });
    log.push('santi: splash variant 7 (inexistente) → 1');
  }

  // ── 10. Uñas de Mar ───────────────────────────────────────────────────────
  {
    const ref = db.doc('config/demo-u-as-de-mar-mpfynv07');
    await ref.update({
      'sections.instagram.handle': '@unas.de.mar',
      'sections.instagram.url': 'https://instagram.com/unas.de.mar',
    });
    log.push('nails: handle IG propio (no @auranailstudio)');
  }

  console.log(log.join('\n'));
  process.exit(0);
}

run().catch((e) => { console.error('FATAL', e); process.exit(1); });
