// lib/paths.ts — Firestore collection/doc path constants.
// Pure constants (no env validation), safe to import from client and server.

/** Firestore root collection + shared data doc (unchanged from original app). */
export const APP_COLLECTION_ROOT = "ticket_events_data";
export const SHARED_DATA_ID = "shared_event_db";

/** Derived Firestore paths used across the app. */
export const paths = {
  ticketsCollection: `${APP_COLLECTION_ROOT}/${SHARED_DATA_ID}/tickets`,
  settingsDoc: `${APP_COLLECTION_ROOT}/${SHARED_DATA_ID}/settings/config`,
  logsCollection: "activity_logs",
  usernamesCollection: "allowed_usernames",
  rolesCollection: "roles",
  locksCollection: "global_locks",
  adminSecurityDoc: "admin_settings/security",
  communicationsCollection: "communications",
  typingCollection: "typing_status",
  presenceRoot: "global_presence",
  contactsCollection: "help_contacts",
} as const;
