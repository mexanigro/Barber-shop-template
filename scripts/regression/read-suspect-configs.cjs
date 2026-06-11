const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

const app = initializeApp({ credential: cert('./serviceAccountKey.json') }, 'readSuspects');
const db = getFirestore(app, 'default');

const IDS = [
  'demo-santi-mq3luclw',
  'demo-pintureria-el-paolo-mpfwkvuh',
  'demo-cafe-aristano-mpfwjz7c',
  'demo-velvet-muse',
  'demo-martellin-mpfwij1m',
  'demo-u-as-de-mar-mpfynv07',
  'demo-estetica-prueba-mpfvpl5u',
];

async function main() {
  for (const id of IDS) {
    const snap = await db.doc(`config/${id}`).get();
    console.log(`\n===== config/${id}: exists=${snap.exists}`);
    if (!snap.exists) continue;
    const d = snap.data();
    console.log(JSON.stringify({
      sectionOrder: d.sectionOrder,
      features: d.features,
      businessMode: d.businessMode,
      heroTitle: d.hero && (d.hero.title || d.hero.titleLine1 || null),
      heroBadge: d.hero && (d.hero.badge || d.hero.tagline || null),
      heroCtas: d.hero && { ctaPrimary: d.hero.ctaPrimary, ctaPrimaryHref: d.hero.ctaPrimaryHref, ctaSecondary: d.hero.ctaSecondary, ctaSecondaryHref: d.hero.ctaSecondaryHref },
      social: d.contact && d.contact.social,
      ownerName: d.owner && d.owner.businessName,
      navbar: d.navbar,
    }, null, 1).slice(0, 2200));
  }
}

main().catch(e => { console.error(e); process.exit(1); });
