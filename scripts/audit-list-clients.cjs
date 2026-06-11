const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { readFileSync } = require('fs');
const path = require('path');

const serviceAccount = JSON.parse(
  readFileSync(path.join(__dirname, '..', 'serviceAccountKey.json'), 'utf8')
);

const app = initializeApp({ credential: cert(serviceAccount) }, 'audit-list-clients');

async function listDb(dbId) {
  const db = getFirestore(app, dbId);
  const snap = await db.collection('config').get();
  const out = [];
  for (const doc of snap.docs) {
    const d = doc.data();
    out.push({
      id: doc.id,
      niche: d.niche || d.activeNiche || (d.branding && d.branding.niche) || '?',
      businessName: (d.owner && d.owner.businessName) || (d.brand && d.brand.name) || d.businessName || '?',
      lang: d.language || d.uiLanguage || '?',
      hasBranding: !!d.branding,
      sectionKeys: d.sections ? Object.keys(d.sections).join(',') : '',
    });
  }
  return out;
}

(async () => {
  for (const dbId of ['default', 'nichos-us-prod']) {
    console.log(`\n===== DATABASE: ${dbId} =====`);
    try {
      const rows = await listDb(dbId);
      rows.forEach(r => console.log(JSON.stringify(r)));
      console.log(`total: ${rows.length}`);
    } catch (e) {
      console.log('ERROR:', e.message);
    }
  }
  process.exit(0);
})();
