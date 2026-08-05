// scripts/check-kiosk-pin.cjs — inspect the kiosk PIN in the admin-only doc.
const admin = require("firebase-admin");
const { getFirestore } = require("firebase-admin/firestore");
const fs = require("node:fs");

const envRaw = fs.readFileSync(".env.local", "utf8");
const getKey = (k) => envRaw.match(new RegExp(`^${k}=(.*)$`, "m"))?.[1];
const sa = JSON.parse(getKey("FIREBASE_SERVICE_ACCOUNT_KEY"));

const app = admin.initializeApp({ credential: admin.cert(sa), projectId: sa.project_id }, "kiosk-check");
const db = getFirestore(app);

db.doc("admin_settings/security")
  .get()
  .then((snap) => {
    console.log("Document exists:", snap.exists);
    console.log("Data:", JSON.stringify(snap.data(), null, 2));
    process.exit(0);
  })
  .catch((e) => {
    console.error("ERROR:", e.message);
    process.exit(1);
  })
  .finally(() => app.delete());
