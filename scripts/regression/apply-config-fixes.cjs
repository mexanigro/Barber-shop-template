// Config-level fixes from the 2026-06-11 mass regression.
// Backs up each doc to qa-regression/backups/ before writing.
const fs = require('fs');
const path = require('path');
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

const app = initializeApp({ credential: cert('./serviceAccountKey.json') }, 'regressionFixes');
const db = getFirestore(app, 'default');
const BAK = path.join(__dirname, '..', '..', 'qa-regression', 'backups');
fs.mkdirSync(BAK, { recursive: true });

async function backup(id) {
  const snap = await db.doc(`config/${id}`).get();
  fs.writeFileSync(path.join(BAK, `${id}.json`), JSON.stringify(snap.data(), null, 2));
  console.log(`backed up config/${id}`);
}

async function main() {
  // 1) velvet-muse: hero.ctaPrimaryHref="#booking" renders an <a> to a non-existent
  //    anchor (booking is a modal) -> primary hero CTA does nothing. Removing the
  //    field makes the hero render a <button onClick=openBooking> instead.
  await backup('demo-velvet-muse');
  await db.doc('config/demo-velvet-muse').update({
    'hero.ctaPrimaryHref': FieldValue.delete(),
  });
  console.log('FIXED demo-velvet-muse: removed hero.ctaPrimaryHref');

  // 2) cafe-aristano: hero h1 shows the cafeteria preset brand "Aroma Vivo"
  //    instead of the client brand. Override prefix/highlight with the brand name
  //    (kept in Latin script, matching the navbar logo and <title>).
  await backup('demo-cafe-aristano-mpfwjz7c');
  await db.doc('config/demo-cafe-aristano-mpfwjz7c').update({
    'hero.titlePrefix': 'Café',
    'hero.titleHighlight': 'Aristano',
  });
  console.log('FIXED demo-cafe-aristano: hero title brand');
}

main().catch((e) => { console.error(e); process.exit(1); });
