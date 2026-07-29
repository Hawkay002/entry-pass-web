// lib/firebase/admin.ts — Firebase Admin SDK singleton (SERVER ONLY).
// Importing this module from a client component will fail the build.
//
// Uses globalThis caching so Next's hot-reload / multiple worker instances
// don't re-initialize the Admin app and exhaust sockets.

import {
  getApp,
  getApps,
  initializeApp,
  cert,
  type App as AdminApp,
} from "firebase-admin/app";
import { getAuth, type Auth as AdminAuth } from "firebase-admin/auth";
import {
  getFirestore,
  type Firestore as AdminFirestore,
} from "firebase-admin/firestore";
import { authConfig } from "@/lib/env";

function getAdminApp(): AdminApp {
  if (getApps().length) return getApp();

  return initializeApp({
    credential: cert(authConfig.serviceAccount as never),
    projectId: authConfig.projectId,
  });
}

// Cache on globalThis to survive HMR in dev.
const globalForAdmin = globalThis as unknown as {
  __adminAuth?: AdminAuth;
  __adminDb?: AdminFirestore;
};

export const adminAuth: AdminAuth =
  globalForAdmin.__adminAuth ?? getAuth(getAdminApp());
export const adminDb: AdminFirestore =
  globalForAdmin.__adminDb ?? getFirestore(getAdminApp());

if (process.env.NODE_ENV !== "production") {
  globalForAdmin.__adminAuth = adminAuth;
  globalForAdmin.__adminDb = adminDb;
}
