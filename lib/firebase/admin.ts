// lib/firebase/admin.ts — Firebase Admin SDK (SERVER ONLY).
// Importing this from a client component fails the build.
//
// Initialization is LAZY: the Admin app is only created the first time
// adminAuth/adminDb is actually used, not at import. This means importing
// the module during SSR data collection (e.g. Next build) does not require
// a valid service account. The real key is only needed when a server
// operation actually calls into Firebase.

import {
  getApp,
  getApps,
  initializeApp,
  cert,
  type App as AdminApp,
} from "firebase-admin/app";
import type { Auth as AdminAuth } from "firebase-admin/auth";
import type { Firestore as AdminFirestore } from "firebase-admin/firestore";
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
    const { getAuth } = require("firebase-admin/auth") as typeof import("firebase-admin/auth");
    _adminAuth = getAuth(createAdminApp());
  }
  return _adminAuth;
}

export function getAdminDb(): AdminFirestore {
  if (!_adminDb) {
    const { getFirestore } = require("firebase-admin/firestore") as typeof import("firebase-admin/firestore");
    _adminDb = getFirestore(createAdminApp());
  }
  return _adminDb;
}

// Backwards-friendly named exports for call sites that prefer them.
// These are getters, so accessing `.adminDb` triggers lazy init too.
export const admin = {
  get auth() {
    return getAdminAuth();
  },
  get db() {
    return getAdminDb();
  },
};
