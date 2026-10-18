"use client";

import { Fragment, useEffect, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "convex/react";
import {
  BarChart3,
  CalendarCheck,
  ClipboardCheck,
  DoorOpen,
  LayoutDashboard,
  LogOut,
  Menu,
  School,
  Settings,
  UserCog,
  Users,
  type LucideIcon,
} from "lucide-react";
import { api } from "@convex/_generated/api";
import type { PublicUser } from "@convex/lib";
import { useAuth } from "./AuthProvider";
import { ErrorBoundary } from "./ErrorBoundary";

type Item = { href: string; label: string; icon: LucideIcon };
type Section = { title?: string; items: Item[] };

function buildNav(role: PublicUser["role"]): Section[] {
  const sections: Section[] = [];
  if (role === "siswa") {
    sections.push({ items: [{ href: "/my-attendance", label: "Kehadiran Saya", icon: CalendarCheck }] });
  } else {
    sections.push({ items: [{ href: "/dashboard", label: "Dashboard", icon: LayoutDashboard }] });
    sections.push({
      title: "Operasional",
      items: [
        { href: "/attendance", label: "Input Absensi", icon: ClipboardCheck },
        { href: "/reports", label: "Laporan", icon: BarChart3 },
      ],
    });
    if (role === "admin") {
      sections.push({
        title: "Master Data",
        items: [
          { href: "/students", label: "Data Siswa", icon: Users },
          { href: "/classes", label: "Data Kelas", icon: DoorOpen },
          { href: "/teachers", label: "Data Guru", icon: UserCog },
        ],
      });
    }
  }
  sections.push({ title: "Sistem", items: [{ href: "/settings", label: "Pengaturan", icon: Settings }] });
  return sections;
}

const ROLE_LABEL = { admin: "Administrator", guru: "Guru", siswa: "Siswa" } as const;

export function Shell({ user, children }: { user: PublicUser; children: ReactNode }) {
  const { token, logout } = useAuth();
  const pathname = usePathname();
  const settings = useQuery(api.settings.get, token ? { token } : "skip");
  const name = settings?.schoolName ?? "EduAbsen";

  useEffect(() => {
    document.title = `Absensi ${name}`;
  }, [name]);

  const closeDrawer = () => {
    const el = document.getElementById("app-drawer") as HTMLInputElement | null;
    if (el) el.checked = false;
  };

  return (
    <div className="drawer lg:drawer-open min-h-screen">
      <input id="app-drawer" type="checkbox" className="drawer-toggle" />

      <div className="drawer-content flex flex-col min-w-0">
        <header className="navbar bg-base-100 border-b border-base-300 min-h-14 px-2 lg:hidden no-print">
          <label htmlFor="app-drawer" className="btn btn-ghost btn-square" aria-label="Buka menu">
            <Menu className="size-6" />
          </label>
          <div className="flex items-center gap-2 ml-1 min-w-0">
            <School className="size-5 text-primary shrink-0" />
            <span className="font-bold truncate">{name}</span>
          </div>
        </header>
        <main className="flex-1 p-4 md:p-6">
          <ErrorBoundary onAuthError={logout}>{children}</ErrorBoundary>
        </main>
      </div>

      <div className="drawer-side z-40 no-print">
        <label htmlFor="app-drawer" aria-label="Tutup menu" className="drawer-overlay" />
        <aside className="bg-base-100 border-r border-base-300 w-64 min-h-full flex flex-col">
          <div className="h-16 flex items-center px-6 border-b border-base-300 shrink-0">
            <School className="size-6 text-primary mr-3 shrink-0" />
            <span className="text-lg font-bold truncate">{name}</span>
          </div>

          <ul className="menu w-full flex-1 p-3 gap-1">
            {buildNav(user.role).map((section, i) => (
              <Fragment key={i}>
                {section.title && <li className="menu-title mt-3">{section.title}</li>}
                {section.items.map(({ href, label, icon: Icon }) => (
                  <li key={href}>
                    <Link href={href} onClick={closeDrawer} className={pathname === href ? "menu-active" : ""}>
                      <Icon className="size-5" /> {label}
                    </Link>
                  </li>
                ))}
              </Fragment>
            ))}
          </ul>
              </li>
            ))}
          </ul>

          <div className="p-4 border-t border-base-300 shrink-0 space-y-3">
            <div className="text-sm min-w-0">
              <p className="font-medium truncate">{user.fullName}</p>
              <p className="text-xs text-base-content/60">{ROLE_LABEL[user.role]}</p>
            </div>
            <button type="button" onClick={logout} className="btn btn-outline w-full">
              <LogOut className="size-4" /> Logout
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}