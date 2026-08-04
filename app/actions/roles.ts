// app/actions/roles.ts — CRUD for the dynamic roles collection.
// Admin creates roles, adds staff (name+email), and the app reads them live.

"use server";

import { getAdminDb } from "@/lib/firebase/admin";
import { paths } from "@/lib/paths";
import { getAppUser } from "@/lib/firebase/server-auth";
import { logAction } from "@/lib/firebase/log";
import type { StaffMember, StaffRole } from "@/lib/types";

/** Fetch all roles (admin only). */
export async function fetchRoles(): Promise<
  { ok: true; roles: StaffRole[] } | { ok: false; error: string }
> {
  const user = await getAppUser();
  if (!user) return { ok: false, error: "Not authenticated." };
  if (user.role !== "admin")
    return { ok: false, error: "Admin role required." };

  const snap = await getAdminDb().collection(paths.rolesCollection).get();
  const roles: StaffRole[] = snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      name: String(data.name ?? d.id),
      staff: (data.staff as StaffMember[]) ?? [],
      createdAt: Number(data.createdAt ?? 0),
    };
  });
  return { ok: true, roles };
}

/** Create a new role. */
export async function createRole(
  roleName: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await getAppUser();
  if (!user || user.role !== "admin")
    return { ok: false, error: "Admin role required." };

  const name = roleName.trim();
  if (!name) return { ok: false, error: "Role name is required." };

  const ref = getAdminDb().collection(paths.rolesCollection).doc(name);
  const existing = await ref.get();
  if (existing.exists)
    return { ok: false, error: "Role already exists." };

  await ref.set({ name, staff: [], createdAt: Date.now() });
  await logAction(user, "LOCK_ACTION", `Created role "${name}".`);
  return { ok: true };
}

/** Add a staff member (name + email) to a role. */
export async function addStaffToRole(
  roleId: string,
  staffName: string,
  staffEmail: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await getAppUser();
  if (!user || user.role !== "admin")
    return { ok: false, error: "Admin role required." };

  const name = staffName.trim();
  const email = staffEmail.trim().toLowerCase();
  if (!name || !email)
    return { ok: false, error: "Name and email are required." };

  const ref = getAdminDb().collection(paths.rolesCollection).doc(roleId);
  const snap = await ref.get();
  if (!snap.exists) return { ok: false, error: "Role not found." };

  const data = snap.data();
  const staff: StaffMember[] = data?.staff ?? [];
  // Prevent duplicates by email.
  if (staff.some((s) => s.email.toLowerCase() === email))
    return { ok: false, error: "Staff member already exists in this role." };

  staff.push({ name, email });
  await ref.update({ staff });
  await logAction(
    user,
    "LOCK_ACTION",
    `Added staff "${name}" (${email}) to role "${roleId}".`
  );
  return { ok: true };
}

/** Remove a staff member from a role by email.
 *  Also revokes their Firebase Auth session so they're logged out immediately. */
export async function removeStaffFromRole(
  roleId: string,
  staffEmail: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await getAppUser();
  if (!user || user.role !== "admin")
    return { ok: false, error: "Admin role required." };

  const ref = getAdminDb().collection(paths.rolesCollection).doc(roleId);
  const snap = await ref.get();
  if (!snap.exists) return { ok: false, error: "Role not found." };

  const data = snap.data();
  const staff: StaffMember[] = data?.staff ?? [];
  const filtered = staff.filter(
    (s) => s.email.toLowerCase() !== staffEmail.toLowerCase()
  );
  await ref.update({ staff: filtered });

  // Check if this email exists in ANY other role.
  const allRolesSnap = await getAdminDb().collection(paths.rolesCollection).get();
  const stillExists = allRolesSnap.docs.some((d) => {
    const s = (d.data().staff as StaffMember[]) ?? [];
    return s.some((m) => m.email.toLowerCase() === staffEmail.toLowerCase());
  });

  // If removed from all roles, revoke their Firebase Auth session immediately.
  if (!stillExists) {
    try {
      const { getAdminAuth } = await import("@/lib/firebase/admin");
      const auth = getAdminAuth();
      const userRecord = await auth.getUserByEmail(staffEmail);
      await auth.revokeRefreshTokens(userRecord.uid);
      console.log(`[removeStaff] Revoked tokens for ${staffEmail} (uid: ${userRecord.uid})`);
    } catch {
      // User might not exist in Auth — ignore
    }
  }

  await logAction(
    user,
    "LOCK_ACTION",
    `Removed staff (${staffEmail}) from role "${roleId}"${!stillExists ? " and revoked access" : ""}.`
  );
  return { ok: true };
}

/** Delete an entire role. */
export async function deleteRole(
  roleId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await getAppUser();
  if (!user || user.role !== "admin")
    return { ok: false, error: "Admin role required." };

  await getAdminDb().collection(paths.rolesCollection).doc(roleId).delete();
  await logAction(user, "LOCK_ACTION", `Deleted role "${roleId}".`);
  return { ok: true };
}
