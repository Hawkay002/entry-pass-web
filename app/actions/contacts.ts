// app/actions/contacts.ts — CRUD for the help_contacts collection.
// Admin can add/edit/delete contacts for the help tray.

"use server";

import { getAdminDb } from "@/lib/firebase/admin";
import { paths } from "@/lib/paths";
import { getAppUser } from "@/lib/firebase/server-auth";
import { logAction } from "@/lib/firebase/log";
import type { HelpContact } from "@/lib/types";

/** Fetch all contacts (any authenticated user). */
export async function fetchContacts(): Promise<
  { ok: true; contacts: HelpContact[] } | { ok: false; error: string }
> {
  const user = await getAppUser();
  if (!user) return { ok: false, error: "Not authenticated." };

  const snap = await getAdminDb()
    .collection(paths.contactsCollection)
    .orderBy("createdAt", "asc")
    .get();

  const contacts: HelpContact[] = snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      role: String(data.role ?? ""),
      name: String(data.name ?? ""),
      phone: data.phone ? String(data.phone) : undefined,
      whatsapp: data.whatsapp ? String(data.whatsapp) : undefined,
      description: String(data.description ?? ""),
      createdAt: Number(data.createdAt ?? 0),
    };
  });

  return { ok: true, contacts };
}

/** Create a new contact (admin only). */
export async function createContact(input: {
  role: string;
  name: string;
  phone?: string;
  whatsapp?: string;
  description: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await getAppUser();
  if (!user || user.role !== "admin")
    return { ok: false, error: "Admin role required." };

  await getAdminDb().collection(paths.contactsCollection).add({
    role: input.role.trim(),
    name: input.name.trim(),
    phone: input.phone?.trim() || null,
    whatsapp: input.whatsapp?.trim() || null,
    description: input.description.trim(),
    createdAt: Date.now(),
  });

  await logAction(user, "CONFIG_CHANGE", `Added contact: ${input.name} (${input.role}).`);
  return { ok: true };
}

/** Update an existing contact (admin only). */
export async function updateContact(
  contactId: string,
  input: {
    role: string;
    name: string;
    phone?: string;
    whatsapp?: string;
    description: string;
  }
): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await getAppUser();
  if (!user || user.role !== "admin")
    return { ok: false, error: "Admin role required." };

  await getAdminDb().collection(paths.contactsCollection).doc(contactId).update({
    role: input.role.trim(),
    name: input.name.trim(),
    phone: input.phone?.trim() || null,
    whatsapp: input.whatsapp?.trim() || null,
    description: input.description.trim(),
  });

  await logAction(user, "CONFIG_CHANGE", `Updated contact: ${input.name} (${input.role}).`);
  return { ok: true };
}

/** Delete a contact (admin only). */
export async function deleteContact(
  contactId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await getAppUser();
  if (!user || user.role !== "admin")
    return { ok: false, error: "Admin role required." };

  await getAdminDb().collection(paths.contactsCollection).doc(contactId).delete();

  await logAction(user, "CONFIG_CHANGE", `Deleted contact: ${contactId}.`);
  return { ok: true };
}
