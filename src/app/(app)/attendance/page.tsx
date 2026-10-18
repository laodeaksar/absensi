"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Save } from "lucide-react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useAuth } from "@/components/AuthProvider";
import { useToast } from "@/components/Toast";
import { EmptyRow, FieldWrap } from "@/components/ui";
import { localDateStr } from "@/lib/dates";
import { errMsg } from "@/lib/errors";
import { useRoleGuard } from "@/lib/useRoleGuard";

type Status = "Hadir" | "Sakit" | "Izin" | "Alpa";
type Row = { studentId: Id<"students">; nis: string; fullName: string; status: Status | ""; notes: string };

const STATUSES: { value: Status; radio: string; text: string }[] = [
  { value: "Hadir", radio: "radio-success", text: "text-success" },
  { value: "Sakit", radio: "radio-warning", text: "text-warning" },
  { value: "Izin", radio: "radio-info", text: "text-info" },
  { value: "Alpa", radio: "radio-error", text: "text-error" },
];

export default function AttendancePage() {
  const allowed = useRoleGuard(["admin", "guru"]);
  const { token } = useAuth();
  const { toast } = useToast();
  const submit = useMutation(api.attendance.submitBatch);

  const classes = useQuery(api.classes.listMine, token && allowed ? { token } : "skip");
  const [date, setDate] = useState(localDateStr());
  const [classId, setClassId] = useState("");
  const [loaded, setLoaded] = useState<{ date: string; classId: Id<"classes"> } | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [saving, setSaving] = useState(false);
  const initKey = useRef<string | null>(null);

  const form = useQuery(
    api.attendance.getForm,
    token && allowed && loaded ? { token, date: loaded.date, classId: loaded.classId } : "skip",
  );

  // Isi tabel dari server sekali per (tanggal, kelas) agar ketikan tidak tertimpa data reaktif
  useEffect(() => {
    if (!form || !loaded) return;
    const key = `${loaded.date}|${loaded.classId}`;
    if (initKey.current === key) return;
    initKey.current = key;
    setRows(form.map((r) => ({ ...r })));
  }, [form, loaded]);

  if (!allowed) return null;

  function show() {
    if (!date || !classId) return toast("Pilih tanggal dan kelas", "error");
    initKey.current = null;
    setLoaded({ date, classId: classId as Id<"classes"> });
  }

  const setStatus = (studentId: string, status: Status) =>
    setRows((rs) => rs.map((r) => (r.studentId === studentId ? { ...r, status } : r)));
  const setNotes = (studentId: string, notes: string) =>
    setRows((rs) => rs.map((r) => (r.studentId === studentId ? { ...r, notes } : r)));
  const markAll = (status: Status) => setRows((rs) => rs.map((r) => ({ ...r, status })));

  async function save() {
    if (!token || !loaded) return;
    const entries = rows
      .filter((r): r is Row & { status: Status } => r.status !== "")
      .map((r) => ({ studentId: r.studentId, status: r.status, notes: r.notes }));
    if (entries.length === 0) return toast("Tidak ada data absensi untuk disimpan", "error");

    setSaving(true);
    try {
      const res = await submit({ token, date: loaded.date, classId: loaded.classId, entries });
      toast(`Absensi tersimpan (${res.saved} siswa)`, "success");
    } catch (err) {
      toast(errMsg(err), "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Input Absensi</h2>

      <div className="card bg-base-100 border border-base-300">
        <div className="card-body p-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <FieldWrap label="Tanggal">
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input w-full" />
            </FieldWrap>
            <FieldWrap label="Kelas">
              <select value={classId} onChange={(e) => setClassId(e.target.value)} className="select w-full">
                <option value="">-- Pilih Kelas --</option>
                {classes?.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.className}
                  </option>
                ))}
              </select>
            </FieldWrap>
            <button type="button" onClick={show} className="btn btn-neutral w-full">
              Tampilkan Daftar Siswa
            </button>
          </div>
        </div>
      </div>

      {loaded && (
        <div className="card bg-base-100 border border-base-300 overflow-hidden">
          <div className="p-4 border-b border-base-300 flex justify-between items-center bg-base-200/60">
            <h3 className="font-semibold">Daftar Siswa</h3>
            <button type="button" onClick={() => markAll("Hadir")} className="btn btn-ghost btn-sm text-primary">
              Tandai Semua Hadir
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th className="w-12">No</th>
                  <th>NIS</th>
                  <th>Nama Siswa</th>
                  {STATUSES.map((s) => (
                    <th key={s.value} className="text-center">
                      <button
                        type="button"
                        onClick={() => markAll(s.value)}
                        title={`Tandai semua ${s.value}`}
                        className={`btn btn-ghost btn-xs ${s.text}`}
                      >
                        {s.value}
                      </button>
                    </th>
                  ))}
                  <th>Keterangan</th>
                </tr>
              </thead>
              <tbody>
                {form === undefined ? (
                  <EmptyRow cols={8}>Memuat...</EmptyRow>
                ) : rows.length === 0 ? (
                  <EmptyRow cols={8}>Tidak ada siswa terdaftar di kelas ini.</EmptyRow>
                ) : (
                  rows.map((r, i) => (
                    <tr key={r.studentId} className="hover:bg-base-200/60">
                      <td>{i + 1}</td>
                      <td>{r.nis}</td>
                      <td className="font-medium">{r.fullName}</td>
                      {STATUSES.map((s) => (
                        <td key={s.value} className="text-center">
                          <input
                            type="radio"
                            name={`st-${r.studentId}`}
                            aria-label={s.value}
                            checked={r.status === s.value}
                            onChange={() => setStatus(r.studentId, s.value)}
                            className={`radio radio-sm ${s.radio}`}
                          />
                        </td>
                      ))}
                      <td>
                        <input
                          type="text"
                          maxLength={200}
                          value={r.notes}
                          onChange={(e) => setNotes(r.studentId, e.target.value)}
                          className="input input-sm w-full"
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="p-4 border-t border-base-300 flex justify-end">
            <button type="button" onClick={save} disabled={saving || rows.length === 0} className="btn btn-primary">
              {saving ? <span className="loading loading-spinner loading-sm" /> : <Save className="size-4" />}
              Simpan Data Absensi
            </button>
          </div>
        </div>
      )}
    </div>
  );
}