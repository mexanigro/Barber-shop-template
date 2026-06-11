/** Velvet Muse — hero 3D roto (PNGs con damero horneado) + imágenes de pelo curadas. */
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { readFileSync } = require('fs');
const path = require('path');

const sa = JSON.parse(readFileSync(path.join(__dirname, '..', 'serviceAccountKey.json'), 'utf8'));
const app = initializeApp({ credential: cert(sa) }, 'audit-velvet');
const db = getFirestore(app, 'default');

const u = (id) => `https://images.unsplash.com/${id}?w=1200&q=80&auto=format&fit=crop`;

(async () => {
  const ref = db.doc('config/demo-velvet-muse');
  await ref.update({
    // El hero 3D usa PNGs con la grilla de transparencia rasterizada — volvemos
    // al hero fotográfico (la foto de salón verificada ya está en hero.backgroundImage).
    'hero.heroVariant': 'standard',
    'heroObjects': FieldValue.delete(),
    'sections.gallery.galleryVariant': FieldValue.delete(),
    'sections.gallery.show3DObject': false,
    'sections.services.show3DObject': false,
    'sections.whyChooseUs.show3DObject': false,
    'sections.contact.show3DObject': false,
    // El componente ya agrega su propio "All" — el del config duplicaba el pill.
    'sections.services.filters': ['Cut', 'Color', 'Smoothing', 'Extensions', 'Styling'],
    'sections.services.images': [
      u('photo-1700760934268-8aa0ef52ce0a'),  // corte en acción
      u('photo-1675034743339-0b0747047727'),  // balayage dimensional
      u('photo-1562322140-8baeececf3df'),     // brushing (existente, verificada)
      u('photo-1554519934-e32b1629d9ee'),     // extensiones voluminosas
      u('photo-1605980625600-88b46abafa8d'),  // bob ceniza terminado
      u('photo-1602549179763-ce6c9df961b7'),  // textura cobriza macro
    ],
    'sections.instagram.images': [
      u('photo-1560869713-7d0a29430803'),
      u('photo-1605980766335-d3a41c7332a1'),
      u('photo-1472747624745-ce92d32d3c24'),
      u('photo-1582095133179-bfd08e2fc6b3'),
      u('photo-1522337360788-8b13dee7a37e'),
      u('photo-1617311454806-1b8b2b8af811'),
    ],
    'gallery': [
      u('photo-1524504388940-b1c1722653e1'),
      u('photo-1438761681033-6461ffad8d80'),
      u('photo-1605980766335-d3a41c7332a1'),
      u('photo-1582095133179-bfd08e2fc6b3'),
    ],
    // El team renderizaba el staff médico del preset estética (Dr./RN con
    // estetoscopio) — sin staff real del salón, mejor sin sección.
    'features.showTeam': false,
  });
  console.log('velvet aplicado');
  process.exit(0);
})();
