// hooks/use-roles.ts — realtime subscription to the roles collection.
// Used by admin to display role cards + staff in Remote Device Management.

"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, query } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { paths } from "@/lib/paths";
import type { StaffMember, StaffRole } from "@/lib/types";

export function useRoles() {
  const [roles, setRoles] = useState<StaffRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, paths.rolesCollection)),
      (snap) => {
        const next: StaffRole[] = [];
        snap.forEach((d) => {
          const data = d.data();
          next.push({
            id: d.id,
            name: String(data.name ?? d.id),
            staff: (data.staff as StaffMember[]) ?? [],
            createdAt: Number(data.createdAt ?? 0),
          });
        });
        setRoles(next);
        setLoading(false);
      },
      (err) => {
        console.error("[useRoles] listener error:", err);
        setLoading(false);
      }
    );
    return unsub;
  }, []);

  return { roles, loading };
}
