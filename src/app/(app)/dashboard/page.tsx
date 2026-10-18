"use client";

import { useQuery } from "convex/react";
import { Thermometer, UserCheck, UserX, Users, type LucideIcon } from "lucide-react";
import { api } from "@convex/_generated/api";
import { useAuth } from "@/components/AuthProvider";
import { StatusDoughnut, TrendChart } from "@/components/Charts";
import { Spinner } from "@/components/ui";
import { useRoleGuard } from "@/lib/useRoleGuard";

const TONES = {
  primary: { text: "text-primary", bg: "bg-primary/10" },
  success: { text: "text-success", bg: "bg-success/10" },
  warning: { text: "text-warning", bg: "bg-warning/10" },
  error: { text: "text-error", bg: "bg-error/10" },
} as const;

function Stat({
  icon: Icon,
  title,
  value,
  tone,
}: {
  icon: LucideIcon;
  title: string;
  value: string | number;
  tone: keyof typeof TONES;
}) {
  const t = TONES[tone];
  return (
    <div className="stats bg-base-100 border border-base-300">
      <div className="stat">
        <div className={`stat-figure ${t.text}`}>
          <div className={`size-12 rounded-full flex items-center justify-center ${t.bg}`}>
            <Icon className="size-6" />
          </div>
        </div>
        <div className="stat-title">{title}</div>
        <div className="stat-value text-2xl">{value}</div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const allowed = useRoleGuard(["admin", "guru"]);
  const { token } = useAuth();
  const data = useQuery(api.reports.dashboard, token && allowed ? { token } : "skip");

  if (!allowed) return null;
  if (!data) return <Spinner />;
  const { stats, chart } = data;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Dashboard Overview</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <Stat icon={Users} title="Total Siswa" value={stats.totalStudents} tone="primary" />
        <Stat icon={UserCheck} title="Hadir Hari Ini" value={stats.hadir} tone="success" />
        <Stat icon={Thermometer} title="Sakit / Izin" value={stats.sakit + stats.izin} tone="warning" />
        <Stat icon={UserX} title="Persentase Kehadiran" value={`${stats.persentase}%`} tone="error" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card bg-base-100 border border-base-300">
          <div className="card-body">
            <h3 className="card-title text-base">Tren Kehadiran (7 Hari Terakhir)</h3>
            {chart.labels.length === 0 ? (
              <p className="text-sm text-base-content/60 py-8 text-center">Belum ada data absensi.</p>
            ) : (
              <TrendChart labels={chart.labels} hadir={chart.hadir} tidakHadir={chart.tidakHadir} />
            )}
          </div>
        </div>
        <div className="card bg-base-100 border border-base-300">
          <div className="card-body">
            <h3 className="card-title text-base">Ringkasan Hari Ini</h3>
            <div className="flex justify-center">
              <div style={{ width: 250 }}>
                <StatusDoughnut values={[stats.hadir, stats.sakit, stats.izin, stats.alpa]} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}