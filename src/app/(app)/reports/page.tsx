"use client";

import { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { Printer } from "lucide-react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useAuth } from "@/components/AuthProvider";
import { useToast } from "@/components/Toast";
import { EmptyRow, FieldWrap, Spinner, StatusBadge } from "@/components/ui";
import { localDateStr, monthStartStr } from "@/lib/dates";
import { useRoleGuard } from "@/lib/useRoleGuard";

type Filter = { start: string; end: string; classId: string };

export default function ReportsPage() {
  const allowed = useRoleGuard(["admin", "guru"]);
  const { token } = useAuth();
  const { toast } = useToast();

  const classes = useQuery(api.classes.listMine, token && allowed ? { token } : "skip");
  const settings = useQuery(api.settings.get, token && allowed ? { token } : "skip");

  const initial: Filter = { start: monthStartStr(), end: localDateStr(), classId: "" };
  const [draft, setDraft] = useState<Filter>(initial);
  const [applied, setApplied] = useState<Filter>(initial);

  const report = useQuery(
    api.reports.report,
    token && allowed
      ? {
          token,
          startDate: applied.start,
          endDate: applied.end,
          classId: applied.classId ? (applied.classId as Id<"classes">) : undefined,
        }
      : "skip",
  );

  const summary = useMemo(() => {
    const rows = report?.rows ?? [];
    const s = { total: rows.length, hadir: 0, sakit: 0, izin: 0, alpa: 0 };
    for (const r of rows) {
      if (r.status === "Hadir") s.hadir++;
      else if (r.status === "Sakit") s.sakit++;
      else if (r.status === "Izin") s.izin++;
      else s.alpa++;
    }
    return { ...s, persen: s.total > 0 ? ((s.hadir / s.total) * 100).toFixed(1) : "0" };
  }, [report]);

  if (!allowed) return null;

  function apply() {
    if (!draft.start || !draft.end) return toast("Isi tanggal awal dan akhir", "error");
    if (draft.start > draft.end) return toast("Tanggal awal tidak boleh melebihi tanggal akhir", "error");
    setApplied(draft);
  }

  return (
    <div id="print-area" className="space-y-4">
      <div className="flex justify-between items-center no-print">
        <h2 className="text-2xl font-bold">Laporan Absensi</h2>
        <button type="button" onClick={() => window.print()} className="btn btn-neutral btn-sm">
          <Printer className="size-4" /> Cetak Laporan
        </button>
      </div>

      <div className="card bg-base-100 border border-base-300 no-print">
        <div className="card-body p-5">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <FieldWrap label="Dari Tanggal">
              <input
                type="date"
                value={draft.start}
                onChange={(e) => setDraft({ ...draft, start: e.target.value })}
                className="input w-full"
              />
            </FieldWrap>
            <FieldWrap label="Sampai Tanggal">
              <input
                type="date"
                value={draft.end}
                onChange={(e) => setDraft({ ...draft, end: e.target.value })}
                className="input w-full"
              />
            </FieldWrap>
            <FieldWrap label="Kelas">
              <select
                value={draft.classId}
                onChange={(e) => setDraft({ ...draft, classId: e.target.value })}
                className="select w-full"
              >
                <option value="">Semua Kelas</option>
                {classes?.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.className}
                  </option>
                ))}
              </select>
            </FieldWrap>
            <button type="button" onClick={apply} className="btn btn-primary w-full">
              Terapkan Filter
            </button>
          </div>
        </div>
      </div>

      {/* Kop laporan (hanya saat dicetak) */}
      <div className="hidden print-only mb-6 text-center border-b pb-4">
        <h1 className="text-2xl font-bold">{settings?.schoolName ?? ""}</h1>
        {settings?.schoolAddress && <p className="text-sm">{settings.schoolAddress}</p>}
        <h2 className="text-lg font-semibold mt-2">Laporan Absensi Siswa</h2>
        <p className="text-base-content/70">
          Periode: {applied.start} s.d {applied.end}
        </p>
      </div>

      {report === undefined ? (
        <Spinner />
      ) : (
        <>
          <div className="stats stats-vertical md:stats-horizontal bg-base-100 border border-base-300 w-full">
            <div className="stat"><div className="stat-title">Total Data</div><div className="stat-value text-primary text-2xl">{summary.total}</div></div>
            <div className="stat"><div className="stat-title">Hadir</div><div className="stat-value text-success text-2xl">{summary.hadir}</div></div>
            <div className="stat"><div className="stat-title">Sakit</div><div className="stat-value text-warning text-2xl">{summary.sakit}</div></div>
            <div className="stat"><div className="stat-title">Izin</div><div className="stat-value text-info text-2xl">{summary.izin}</div></div>
            <div className="stat"><div className="stat-title">Alpa</div><div className="stat-value text-error text-2xl">{summary.alpa}</div></div>
            <div className="stat"><div className="stat-title">Tingkat Kehadiran</div><div className="stat-value text-primary">{summary.persen}%</div></div>
          </div>

          {report.truncated && (
            <div role="alert" className="alert alert-warning no-print">
              <span>Data terlalu banyak dan dipotong. Persempit rentang tanggal atau pilih satu kelas.</span>
            </div>
          )}

          <div className="card bg-base-100 border border-base-300 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="table table-zebra">
                <thead>
                  <tr>
                    <th>Tanggal</th>
                    <th>NIS</th>
                    <th>Nama Siswa</th>
                    <th>Kelas</th>
                    <th>Status</th>
                    <th>Keterangan</th>
                  </tr>
                </thead>
                <tbody>
                  {report.rows.length === 0 ? (
                    <EmptyRow cols={6}>Tidak ada data ditemukan.</EmptyRow>
                  ) : (
                    report.rows.map((r) => (
                      <tr key={r.id}>
                        <td>{r.date}</td>
                        <td>{r.nis}</td>
                        <td className="font-medium">{r.studentName}</td>
                        <td>{r.className}</td>
                        <td><StatusBadge status={r.status} /></td>
                        <td>{r.notes || "-"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Tanda tangan kepala sekolah (hanya saat dicetak) */}
          <div className="hidden print-only mt-10">
            <div className="ml-auto w-64 text-center text-sm">
              <p>
                Mengetahui,
                <br />
                Kepala Sekolah
              </p>
              <p className="mt-16 font-semibold underline">{settings?.principalName || "\u00A0"}</p>
              {settings?.principalNip && <p>NIP. {settings.principalNip}</p>}
            </div>
          </div>
        </>
      )}
    </div>
  );
}