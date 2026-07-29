// scripts/test-cookie.cjs — test native admin createSessionCookie.
const admin = require("firebase-admin");
const { getAuth } = require("firebase-admin/auth");
const firebase = require("firebase/app");
const { getAuth: getClientAuth, signInWithEmailAndPassword, getIdToken } = require("firebase/auth");
const fs = require("node:fs");

const envRaw = fs.readFileSync(".env.local", "utf8");
const getKey = (k) => envRaw.match(new RegExp(`^${k}=(.*)$`, "m"))?.[1];
const sa = JSON.parse(getKey("FIREBASE_SERVICE_ACCOUNT_KEY"));

async function main() {
  // 1. Client sign-in -> ID token
  const app = firebase.initializeApp({
    apiKey: getKey("NEXT_PUBLIC_FIREBASE_API_KEY"),
    authDomain: getKey("NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN"),
    projectId: getKey("NEXT_PUBLIC_FIREBASE_PROJECT_ID"),
  });
  const cred = await signInWithEmailAndPassword(
    getClientAuth(app),
    "admin.test@gmail.com",
    "admintest@123456"
  );
  const idToken = await getIdToken(cred.user);
  console.log("ID token len:", idToken.length);

  // 2. Native admin createSessionCookie
  const adminApp = admin.initializeApp(
    { credential: admin.cert(sa), projectId: sa.project_id },
    "cookietest"
  );
  const auth = getAuth(adminApp);
  try {
    const cookie = await auth.createSessionCookie(idToken, {
      expiresIn: 60 * 60 * 24 * 14 * 1000,
    });
    console.log("NATIVE createSessionCookie OK, cookie len:", cookie.length);
  } catch (e) {
    console.log("NATIVE ERR:", e.code, "|", e.message);
  }
  await adminApp.delete();
}

main().catch((e) => console.error("FAILED:", e.message));
