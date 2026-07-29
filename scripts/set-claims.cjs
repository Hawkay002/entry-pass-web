// scripts/set-claims.cjs — one-off: list Auth users and set role custom claims.
// Run: node scripts/set-claims.cjs
// Dev utility, not part of the app runtime.
const admin = require("firebase-admin");
const { getAuth } = require("firebase-admin/auth");
const fs = require("node:fs");
const path = require("node:path");

const envRaw = fs.readFileSync(path.join(__dirname, "..", ".env.local"), "utf8");
const getKey = (k) => {
  const m = envRaw.match(new RegExp(`^${k}=(.*)$`, "m"));
  return m ? m[1] : null;
};

const sa = JSON.parse(getKey("FIREBASE_SERVICE_ACCOUNT_KEY"));
const app = admin.initializeApp(
  { credential: admin.cert(sa), projectId: sa.project_id },
  "claim-setup"
);

// Map known emails -> roles (mirrors the original hardcoded MANAGED_USERS).
const ROLE_BY_EMAIL = {
  "admin.test@gmail.com": "admin",
  "eveman.test@gmail.com": "event_manager",
  "regdesk.test@gmail.com": "registration_desk",
  "sechead.test@gmail.com": "security_head",
};

async function main() {
  const auth = getAuth(app);
  const list = await auth.listUsers(100);
  console.log(`\n=== ${list.users.length} AUTH USER(S) ===`);
  for (const u of list.users) {
    const role = ROLE_BY_EMAIL[u.email];
    console.log(
      `  ${u.email} | uid=${u.uid} | current claims=${JSON.stringify(u.customClaims || {})}`
    );
    if (role) {
      await auth.setCustomUserClaims(u.uid, { ...u.customClaims, role });
      console.log(`    ✅ set role="${role}"`);
    } else {
      console.log(`    ⏭️  no role mapping for this email (skipped)`);
    }
  }
  console.log("\nDone. New logins will carry the role claim.");
  await app.delete();
}

main().catch((e) => {
  console.error("FAILED:", e.message);
  process.exit(1);
});
