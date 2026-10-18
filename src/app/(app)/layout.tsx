"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { Shell } from "@/components/Shell";
import { Spinner } from "@/components/ui";

export default function AppLayout({ children }: { children: ReactNode }) {
  const { user, ready } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (ready && !user) router.replace("/login");
  }, [ready, user, router]);

  // Akun dengan password bawaan wajib menggantinya dulu
  useEffect(() => {
    if (user?.mustChangePassword && pathname !== "/settings") router.replace("/settings");
  }, [user, pathname, router]);

  if (!ready || !user) return <Spinner label="Memuat..." />;
  return <Shell user={user}>{children}</Shell>;
}