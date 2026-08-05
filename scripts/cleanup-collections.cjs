// scripts/cleanup-collections.cjs — delete orphaned Firestore collections.
const admin = require("firebase-admin");
const { getFirestore } = require("firebase-admin/firestore");
const fs = require("node:fs");
const path = require("node:path");

const envRaw = fs.readFileSync(path.join(__dirname, "..", ".env.local"), "utf8");
const sa = JSON.parse(envRaw.match(/FIREBASE_SERVICE_ACCOUNT_KEY=(.*)$/m)[1]);
const app = admin.initializeApp({ credential: admin.cert(sa), projectId: sa.project_id }, "cleanup");
const db = getFirestore(app);

(async () => {
  for (const col of ["communications", "typing_status", "global_presence"]) {
    const snap = await db.collection(col).get();
    if (snap.empty) { console.log(col + ": already empty"); continue; }
    const batch = db.batch();
    snap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
    console.log(col + ": deleted " + snap.size + " docs");
  }
  console.log("Done");
  await app.delete();
})();
