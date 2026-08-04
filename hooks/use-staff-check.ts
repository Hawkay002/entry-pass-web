// hooks/use-staff-check.ts — realtime check: is the current staff still in any role?
// If not (admin removed them), immediately sign out and redirect to /login.
// Uses onSnapshot on the roles collection so it's instant — no polling.

"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { collection, onSnapshot, query } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { paths } from "@/lib/paths";

export function useStaffCheck(userEmail: string | null, isAdmin: boolean) {
  const router = useRouter();

  useEffect(() => {
    // Only run for non-admin staff.
    if (!userEmail || isAdmin) return;

    const unsub = onSnapshot(
      query(collection(db, paths.rolesCollection)),
      (snap) => {
        // Check if this email exists in ANY role's staff list.
        let found = false;
        snap.docs.forEach((d) => {
          const staff = (d.data().staff as { email: string }[]) ?? [];
          if (staff.some((s) => s.email.toLowerCase() === userEmail.toLowerCase())) {
            found = true;
          }
        });

        if (!found) {
          // Staff has been removed — kick them out immediately.
          console.log("[staff-check] User removed from all roles, signing out");
          // Clear session cookie + redirect
          fetch("/api/logout", { method: "POST" }).then(() => {
            router.push("/login");
            router.refresh();
          });
        }
      },
      (err) => {
        console.error("[staff-check] listener error:", err);
      }
    );

    return unsub;
  }, [userEmail, isAdmin, router]);
}
