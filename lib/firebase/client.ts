// lib/firebase/client.ts — Firebase client SDK singleton.
// Used for realtime onSnapshot listeners and client-side auth (sign-in).
//
// IMPORTANT: reads ONLY NEXT_PUBLIC_* env vars directly (not via lib/env.ts),
// because lib/env.ts validates server secrets (cookie key, service account)
// and would throw in the browser bundle.

import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

export const clientEnv = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
};

const app: FirebaseApp = getApps().length ? getApp() : initializeApp(clientEnv);

export const auth: Auth = getAuth(app);
export const db: Firestore = getFirestore(app);
