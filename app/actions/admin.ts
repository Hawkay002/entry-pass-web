// app/actions/admin.ts — server actions for admin-only operations.
// All authenticated via session cookie + role-checked server-side.
// Replaces the original app's client-side-only admin writes + plaintext passwords.

"use server";

import { getAdminDb } from "@/lib/firebase/admin";
import { paths } from "@/lib/paths";
import { getAppUser } from "@/lib/firebase/server-auth";
import { logAction } from "@/lib/firebase/log";
import { requireAdmin } from "@/lib/auth";
import type {
  ActivityLog,
  EventSettings,
  LockReasonType,
  Role,
  StaffUser,
} from "@/lib/types";
import { revalidatePath } from "next/cache";

// ---------------- Activity Logs ----------------

export async function fetchActivityLogs(): Promise<
  { ok: true; logs: ActivityLog[] } | { ok: false; error: string }
> {
  const user = await getAppUser();
  if (!user) return { ok: false, error: "Not authenticated." };
  if (user.role !== "admin")
    return { ok: false, error: "Admin role required." };

  const snap = await getAdminDb()
    .collection(paths.logsCollection)
    .orderBy("timestamp", "desc")
    .limit(500)
    .get();

  const logs: ActivityLog[] = snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      timestamp: Number(data.timestamp ?? 0),
      userEmail: String(data.userEmail ?? ""),
      username: String(data.username ?? ""),
      action: data.action as ActivityLog["action"],
      details: String(data.details ?? ""),
    };
  });

  return { ok: true, logs };
}

export async function deleteLogs(
  ids: string[]
): Promise<{ ok: true; count: number } | { ok: false; error: string }> {
  const user = await getAppUser();
  requireAdmin(user);

  const db = getAdminDb();
  let count = 0;
  for (const id of ids) {
    await db.collection(paths.logsCollection).doc(id).delete();
    count++;
  }
  await logAction(user, "LOG_DELETE", `Deleted ${count} log(s).`);
  revalidatePath("/logs");
  return { ok: true, count };
}

// ---------------- Settings ----------------

export async function saveSettings(
  settings: EventSettings
): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await getAppUser();
  if (!user) return { ok: false, error: "Not authenticated." };

  await getAdminDb()
    .doc(paths.settingsDoc)
    .set(
      {
        name: settings.name,
        place: settings.place,
        deadline: settings.deadline,
      },
      { merge: true }
    );

  await logAction(
    user,
    "CONFIG_CHANGE",
    `Settings updated: "${settings.name}" at ${settings.place}`
  );
  return { ok: true };
}

// ---------------- Staff-user management ----------------

export async function fetchStaffUsers(): Promise<
  { ok: true; users: StaffUser[] } | { ok: false; error: string }
> {
  const user = await getAppUser();
  if (!user) return { ok: false, error: "Not authenticated." };
  if (user.role !== "admin")
    return { ok: false, error: "Admin role required." };

  const snap = await getAdminDb().collection(paths.usernamesCollection).get();
  const users: StaffUser[] = snap.docs.map((d) => {
    const data = d.data();
    return {
      username: d.id,
      realName: String(data.realName ?? ""),
      role: data.role as Role,
      email: String(data.email ?? ""),
      createdAt: Number(data.createdAt ?? 0),
    };
  });
  return { ok: true, users };
}

export async function createStaffUser(
  input: {
    username: string;
    realName: string;
    role: Role;
    email: string;
  }
): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await getAppUser();
  requireAdmin(user);

  const username = input.username.trim();
  if (!username || !input.email) {
    return { ok: false, error: "Username and email are required." };
  }

  const ref = getAdminDb().collection(paths.usernamesCollection).doc(username);
  const existing = await ref.get();
  if (existing.exists) {
    return { ok: false, error: "Username already exists." };
  }

  await ref.set({
    realName: input.realName.trim(),
    role: input.role,
    email: input.email.trim(),
    createdAt: Date.now(),
  });

  await logAction(
    user,
    "LOCK_ACTION",
    `Created staff user "${username}" (${input.realName}, ${input.role}).`
  );
  return { ok: true };
}

export async function deleteStaffUser(
  username: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await getAppUser();
  requireAdmin(user);

  await getAdminDb()
    .collection(paths.usernamesCollection)
    .doc(username)
    .delete();

  await logAction(user, "LOCK_ACTION", `Deleted staff user "${username}".`);
  return { ok: true };
}

// ---------------- Remote Lock ----------------

export async function applyRemoteLocks(input: {
  targetEmail: string;
  usernames: string[];
  lockedTabs: string[];
  reason: LockReasonType;
  duration: string | null;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await getAppUser();
  requireAdmin(user);

  const ref = getAdminDb().collection(paths.locksCollection).doc(input.targetEmail);
  const now = Date.now();
  const meta = { type: input.reason, duration: input.duration, updatedAt: now };

  // Write per-username locks via merge so other users on the same email are untouched.
  const update: Record<string, unknown> = { updatedAt: now };
  for (const username of input.usernames) {
    update[`userSpecificLocks.${username}`] = input.lockedTabs;
    update[`lockMetadata.${username}`] = meta;
  }

  const existing = await ref.get();
  if (!existing.exists) {
    await ref.set({
      userSpecificLocks: Object.fromEntries(
        input.usernames.map((u) => [u, input.lockedTabs])
      ),
      lockMetadata: Object.fromEntries(input.usernames.map((u) => [u, meta])),
      updatedAt: now,
    });
  } else {
    await ref.set(update, { merge: true });
  }

  await logAction(
    user,
    "LOCK_ACTION",
    `Locked tabs (${input.lockedTabs.join(", ") || "none"}) for [${input.usernames.join(", ")}]. Reason: ${input.reason.toUpperCase()}`
  );
  return { ok: true };
}

// ---------------- Factory Reset ----------------

export async function factoryReset(): Promise<
  { ok: true } | { ok: false; error: string }
> {
  const user = await getAppUser();
  requireAdmin(user);

  // 1. Write an audit record to a RESET-PROOF collection BEFORE wiping,
  //    so the FACTORY_RESET survives (unlike the original which deleted its own log).
  await getAdminDb()
    .collection("audit_trail")
    .add({
      timestamp: Date.now(),
      userEmail: user.email ?? "",
      username: user.username,
      action: "FACTORY_RESET",
      details: `Admin (${user.username}) initiated FACTORY RESET. All data wiped.`,
    });

  // 2. Also log to activity_logs (will be wiped below, but kept for parity).
  await logAction(
    user,
    "FACTORY_RESET",
    `Admin (${user.username}) initiated FACTORY RESET. All data wiped.`
  );

  const db = getAdminDb();

  // 3. Delete tickets.
  const ticketsSnap = await db.collection(paths.ticketsCollection).get();
  await Promise.all(ticketsSnap.docs.map((d) => d.ref.delete()));

  // 4. Delete settings/config.
  await db.doc(paths.settingsDoc).delete();

  // 5. Delete all global_locks.
  const locksSnap = await db.collection(paths.locksCollection).get();
  await Promise.all(locksSnap.docs.map((d) => d.ref.delete()));

  // 6. Delete admin_settings/security (legacy password doc — now empty).
  await db.doc(paths.adminSecurityDoc).delete();

  // 7. Delete all activity_logs.
  const logsSnap = await db.collection(paths.logsCollection).get();
  await Promise.all(logsSnap.docs.map((d) => d.ref.delete()));

  revalidatePath("/guests");
  revalidatePath("/settings");
  revalidatePath("/logs");
  return { ok: true };
}
