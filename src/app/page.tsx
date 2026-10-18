"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { Spinner } from "@/components/ui";

// Beranda hanya mengarahkan sesuai status login dan peran
export default function Home() {
  const { user, ready } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!ready) return;
    if (!user) router.replace("/login");
    else if (user.mustChangePassword) router.replace("/settings");
    else router.replace(user.role === "siswa" ? "/my-attendance" : "/dashboard");
  }, [ready, user, router]);

  return <Spinner />;
}