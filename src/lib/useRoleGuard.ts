"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import type { Role } from "@convex/lib";
import { useAuth } from "@/components/AuthProvider";

// Mengembalikan true jika peran pengguna diizinkan; jika tidak, diarahkan ke beranda.
// (Keamanan sebenarnya tetap di server; ini hanya merapikan tampilan.)
export function useRoleGuard(roles: Role[]): boolean {
  const { user, ready } = useAuth();
  const router = useRouter();
  const allowed = !!user && roles.includes(user.role);

  useEffect(() => {
    if (ready && user && !allowed) router.replace("/");
  }, [ready, user, allowed, router]);

  return allowed;
}