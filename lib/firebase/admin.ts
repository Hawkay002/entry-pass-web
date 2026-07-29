// lib/firebase/admin.ts — Firebase Admin SDK (SERVER ONLY).
// Importing this from a client component fails the build.
//
// Initialization is LAZY: the Admin app is only created the first time
// adminAuth/adminDb is actually used, not at import. This means importing
// the module during SSR data collection (e.g. Next build) does not require
// a valid service account. The real key is only needed when a server
// operation actually calls into Firebase.
//
// firebase-admin v14 API: use getAuth(app)/getFirestore(app) and admin.cert()
// (NOT app.auth() / admin.credential.cert()).

import {
  initializeApp,
  getApps,
  getApp,
  cert,
  type App as AdminApp,
} from "firebase-admin/app";
import { getAuth, type Auth as AdminAuth } from "firebase-admin/auth";
import {
  getFirestore,
  type Firestore as AdminFirestore,
} from "firebase-admin/firestore";
import { authConfig } from "@/lib/env";

function createAdminApp(): AdminApp {
  if (getApps().length) return getApp();
  return initializeApp({
    credential: cert(authConfig.serviceAccount as never),
    projectId: authConfig.projectId,
  });
}

// Lazy getters — defer initialization until first real use.
let _adminAuth: AdminAuth | null = null;
let _adminDb: AdminFirestore | null = null;

export function getAdminAuth(): AdminAuth {
  if (!_adminAuth) {
    _adminAuth = getAuth(createAdminApp());
  }
  return _adminAuth;
}

export function getAdminDb(): AdminFirestore {
  if (!_adminDb) {
    _adminDb = getFirestore(createAdminApp());
  }
  return _adminDb;
}

// Convenience object with lazy getters.
export const admin = {
  get auth() {
    return getAdminAuth();
  },
  get db() {
    return getAdminDb();
  },
};
