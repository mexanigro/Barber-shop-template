const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { readFileSync, writeFileSync, mkdirSync } = require('fs');
const path = require('path');

const serviceAccount = JSON.parse(
  readFileSync(path.join(__dirname, '..', 'serviceAccountKey.json'), 'utf8')
);
const app = initializeApp({ credential: cert(serviceAccount) }, 'audit-dump-configs');

const outDir = path.join(__dirname, '..', 'qa-audit', 'configs');
mkdirSync(outDir, { recursive: true });

(async () => {
  for (const dbId of ['default', 'nichos-us-prod']) {
    const db = getFirestore(app, dbId);
    const snap = await db.collection('config').get();
    for (const doc of snap.docs) {
      const file = path.join(outDir, `${dbId}__${doc.id}.json`);
      writeFileSync(file, JSON.stringify(doc.data(), null, 2));
    }
    console.log(`${dbId}: ${snap.size} docs dumped`);
  }
  process.exit(0);
})();
