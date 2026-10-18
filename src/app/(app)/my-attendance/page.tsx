"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { useAuth } from "@/components/AuthProvider";
import { useToast } from "@/components/Toast";
import { EmptyRow, FieldWrap, Spinner, StatusBadge } from "@/components/ui";
import { localDateStr, monthStartStr } from "@/lib/dates";
import { useRoleGuard } from "@/lib/useRoleGuard";

type Range = { start: string; end: string };

export default function MyAttendancePage() {
  const allowed = useRoleGuard(["siswa"]);
  const { token } = useAuth();
  const { toast } = useToast();

  const initial: Range = { start: monthStartStr(), end: localDateStr() };
  const [draft, setDraft] = useState<Range>(initial);
  const [applied, setApplied] = useState<Range>(initial);

  const data = useQuery(
    api.studentPortal.myAttendance,
    token && allowed ? { token, startDate: applied.start, endDate: applied.end } : "skip",
  );

  if (!allowed) return null;

  function apply() {
    if (!draft.start || !draft.end) return toast("Isi tanggal awal dan akhir", "error");
    if (draft.start > draft.end) return toast("Tanggal awal tidak boleh melebihi tanggal akhir", "error");
    setApplied(draft);
  }

  if (!data) return <Spinner />;
  const { profile, today, summary, records } = data;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold">Kehadiran Saya</h2>
        <p className="text-sm text-base-content/60">
          {profile.fullName} - NIS {profile.nis} - Kelas {profile.className}
        </p>
      </div>

      <div className="card bg-base-100 border border-base-300">
        <div className="card-body p-5 flex-row items-center justify-between gap-4">
          <div>
            <p className="text-sm text-base-content/60">Status hari ini</p>
            {today?.notes && <p className="text-xs text-base-content/60 mt-1">{today.notes}</p>}
          </div>
          {today ? <StatusBadge status={today.status} /> : <span className="badge badge-soft badge-ghost">Belum diisi</span>}
        </div>
      </div>

      <div className="card bg-base-100 border border-base-300">
        <div className="card-body p-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <FieldWrap label="Dari Tanggal">
              <input type="date" value={draft.start} onChange={(e) => setDraft({ ...draft, start: e.target.value })} className="input w-full" />
            </FieldWrap>
            <FieldWrap label="Sampai Tanggal">
              <input type="date" value={draft.end} onChange={(e) => setDraft({ ...draft, end: e.target.value })} className="input w-full" />
            </FieldWrap>
            <button type="button" onClick={apply} className="btn btn-primary w-full">Tampilkan</button>
          </div>
        </div>
      </div>

      <div className="stats stats-vertical sm:stats-horizontal bg-base-100 border border-base-300 w-full">
        <div className="stat"><div className="stat-title">Hadir</div><div className="stat-value text-success text-2xl">{summary.hadir}</div></div>
        <div className="stat"><div className="stat-title">Sakit</div><div className="stat-value text-warning text-2xl">{summary.sakit}</div></div>
        <div className="stat"><div className="stat-title">Izin</div><div className="stat-value text-info text-2xl">{summary.izin}</div></div>
        <div className="stat"><div className="stat-title">Alpa</div><div className="stat-value text-error text-2xl">{summary.alpa}</div></div>
        <div className="stat"><div className="stat-title">Kehadiran</div><div className="stat-value text-primary text-2xl">{summary.persentase}%</div></div>
      </div>

      <div className="card bg-base-100 border border-base-300 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table table-zebra">
            <thead>
              <tr>
                <th>Tanggal</th>
                <th>Status</th>
                <th>Keterangan</th>
              </tr>
            </thead>
            <tbody>
              {records.length === 0 ? (
                <EmptyRow cols={3}>Belum ada data absensi pada periode ini.</EmptyRow>
              ) : (
                records.map((r) => (
                  <tr key={r.id}>
                    <td>{r.date}</td>
                    <td><StatusBadge status={r.status} /></td>
                    <td>{r.notes || "-"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}