// lib/env.ts — typed, validated environment access.
// Throws early if a required variable is missing, with a clear message.

function required(name: string, val: string | undefined): string {
  if (!val || val.trim() === "") {
    throw new Error(
      `Missing required environment variable: ${name}. ` +
        `Copy .env.local.example to .env.local and fill it in.`
    );
  }
  return val;
}

/**
 * Public Firebase client config. Safe to expose to the browser — these are
 * the same values already hardcoded in the current Entry-pass app.
 */
export const clientEnv = {
  apiKey: required(
    "NEXT_PUBLIC_FIREBASE_API_KEY",
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY
  ),
  authDomain: required(
    "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
  ),
  projectId: required(
    "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
  ),
  storageBucket: required(
    "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET",
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
  ),
  messagingSenderId: required(
    "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
  ),
  appId: required(
    "NEXT_PUBLIC_FIREBASE_APP_ID",
    process.env.NEXT_PUBLIC_FIREBASE_APP_ID
  ),
} as const;

/**
 * Server-only auth config for next-firebase-auth-edge + firebase-admin.
 * Accessing this object on the client will throw at build/runtime.
 */
function getServiceAccount(): Record<string, unknown> {
  const raw = required(
    "FIREBASE_SERVICE_ACCOUNT_KEY",
    process.env.FIREBASE_SERVICE_ACCOUNT_KEY
  );
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error(
      "FIREBASE_SERVICE_ACCOUNT_KEY is not valid JSON. " +
        "Paste the full service account JSON on one line in .env.local."
    );
  }
}

export const authConfig = {
  cookieName: process.env.AUTH_COOKIE_NAME ?? "session",
  cookieSignatureKeys: required(
    "COOKIE_SIGNATURE_KEY_CURRENT",
    process.env.COOKIE_SIGNATURE_KEY_CURRENT
  ).split(","),
  serviceAccount: getServiceAccount(),
  apiKey: clientEnv.apiKey,
  projectId: clientEnv.projectId,
  // 14-day session, matching the previous app's cookie lifetime.
  cookieSerializeOptions: {
    path: "/",
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 14,
  },
} as const;

/** Firestore root collection + shared data doc (unchanged from original). */
export const APP_COLLECTION_ROOT = "ticket_events_data";
export const SHARED_DATA_ID = "shared_event_db";

/** Derived Firestore paths used across the app. */
export const paths = {
  ticketsCollection: `${APP_COLLECTION_ROOT}/${SHARED_DATA_ID}/tickets`,
  settingsDoc: `${APP_COLLECTION_ROOT}/${SHARED_DATA_ID}/settings/config`,
  logsCollection: "activity_logs",
  usernamesCollection: "allowed_usernames",
  locksCollection: "global_locks",
  adminSecurityDoc: "admin_settings/security",
  communicationsCollection: "communications",
  typingCollection: "typing_status",
  presenceRoot: "global_presence",
} as const;
