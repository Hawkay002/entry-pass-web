// lib/firebase/client.ts — Firebase client SDK singleton.
// Used for realtime onSnapshot listeners and client-side auth (sign-in).

import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { clientEnv } from "@/lib/env";

const app: FirebaseApp = getApps().length ? getApp() : initializeApp(clientEnv);

export const auth: Auth = getAuth(app);
export const db: Firestore = getFirestore(app);
export { clientEnv };
