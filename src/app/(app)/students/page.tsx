"use client";

import { useState } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { KeyRound, Plus, Search } from "lucide-react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { vNis, vNisn, vPersonName } from "@convex/validators";
import { useAuth } from "@/components/AuthProvider";
import { useToast } from "@/components/Toast";
import {
  ActiveBadge,
  ConfirmDialog,
  EmptyRow,
  Modal,
  SelectField,
  Spinner,
  TextField,
} from "@/components/ui";
import { errMsg } from "@/lib/errors";
import { collectErrors, useForm } from "@/lib/useForm";
import { useRoleGuard } from "@/lib/useRoleGuard";

type Form = {
  nis: string;
  nisn: string;
  fullName: string;
  gender: "L" | "P";
  classId: string;
  isActive: boolean;
};
const EMPTY: Form = { nis: "", nisn: "", fullName: "", gender: "L", classId: "", isActive: true };

export default function StudentsPage() {
  const allowed = useRoleGuard(["admin"]);
  const { token } = useAuth();
  const { toast } = useToast();

  const students = useQuery(api.students.list, token && allowed ? { token } : "skip");
  const classes = useQuery(api.classes.list, token && allowed ? { token } : "skip");
  const save = useMutation(api.students.save);
  const resetAccount = useMutation(api.studentPortal.resetAccount);
  const generateAccounts = useAction(api.studentPortal.generateAccounts);

  const { values, errors, set, setErrors, reset } = useForm<Form>(EMPTY);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<Id<"students"> | null>(null);
  const [query, setQuery] = useState("");
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [confirm, setConfirm] = useState<{ message: string; run: () => Promise<void> } | null>(null);

  if (!allowed) return null;

  const activeClasses = classes?.filter((c) => c.isActive || c._id === values.classId) ?? [];

  function openAdd() {
    if (!classes || !classes.some((c) => c.isActive)) {
      return toast("Belum ada kelas aktif. Tambahkan kelas terlebih dahulu.", "error");
    }
    reset(EMPTY);
    setEditId(null);
    setOpen(true);
  }

  function openEdit(s: NonNullable<typeof students>[number]) {
    reset({
      nis: s.nis,
      nisn: s.nisn,
      fullName: s.fullName,
      gender: s.gender,
      classId: s.classId ?? "",
      isActive: s.isActive,
    });
    setEditId(s._id);
    setOpen(true);
  }

  async function submit() {
    if (!token) return;
    const { errors: found, hasError } = collectErrors<Form>({
      nis: vNis(values.nis),
      nisn: vNisn(values.nisn),
      fullName: vPersonName(values.fullName),
      classId: values.classId ? "" : "Pilih kelas terlebih dahulu",
    });
    if (hasError) return setErrors(found);

    setSaving(true);
    try {
      await save({
        token,
        id: editId ?? undefined,
        nis: values.nis,
        nisn: values.nisn,
        fullName: values.fullName,
        gender: values.gender,
        classId: values.classId as Id<"classes">,
        isActive: editId ? values.isActive : undefined,
      });
      toast("Data siswa tersimpan", "success");
      setOpen(false);
    } catch (err) {
      const msg = errMsg(err);
      if (/NISN/.test(msg)) setErrors({ nisn: msg });
      else if (/NIS/.test(msg)) setErrors({ nis: msg });
      else toast(msg, "error");
    } finally {
      setSaving(false);
    }
  }

  function askGenerate() {
    setConfirm({
      message: "Buat akun login untuk semua siswa aktif yang belum punya akun?\nUsername = NIS, password awal = NISN.",
      run: async () => {
        if (!token) return;
        setGenerating(true);
        try {
          const res = await generateAccounts({ token });
          let msg = `${res.created} akun siswa dibuat.`;
          if (res.skipped.length > 0) {
            msg += ` ${res.skipped.length} dilewati (${res.skipped.slice(0, 3).join("; ")}${res.skipped.length > 3 ? "; ..." : ""}).`;
          }
          toast(msg, "success");
        } catch (err) {
          toast(errMsg(err), "error");
        } finally {
          setGenerating(false);
        }
      },
    });
  }

  function askReset(id: Id<"students">) {
    setConfirm({
      message: "Buat atau reset akun siswa ini?\nUsername = NIS, password = NISN. Siswa diminta menggantinya saat login.",
      run: async () => {
        if (!token) return;
        try {
          const res = await resetAccount({ token, studentId: id });
          toast(res.message, "success");
        } catch (err) {
          toast(errMsg(err), "error");
        }
      },
    });
  }

  const q = query.trim().toLowerCase();
  const filtered = (students ?? []).filter(
    (s) => !q || s.fullName.toLowerCase().includes(q) || s.nis.toLowerCase().includes(q) || s.nisn.includes(q),
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-between items-center gap-2">
        <h2 className="text-2xl font-bold">Master Data Siswa</h2>
        <div className="flex gap-2">
          <button type="button" onClick={askGenerate} disabled={generating} className="btn btn-outline btn-sm">
            {generating ? <span className="loading loading-spinner loading-xs" /> : <KeyRound className="size-4" />}
            Buat Akun Siswa
          </button>
          <button type="button" onClick={openAdd} className="btn btn-primary btn-sm">
            <Plus className="size-4" /> Tambah Siswa
          </button>
        </div>
      </div>

      <div className="card bg-base-100 border border-base-300 overflow-hidden">
        <div className="p-4 border-b border-base-300 bg-base-200/60">
          <label className="input input-sm w-full max-w-xs">
            <Search className="size-4 opacity-50" />
            <input
              type="search"
              placeholder="Cari nama atau NIS..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
        </div>

        {students === undefined ? (
          <Spinner />
        ) : (
          <div className="overflow-x-auto">
            <table className="table table-zebra">
              <thead>
                <tr>
                  <th>NIS/NISN</th>
                  <th>Nama Lengkap</th>
                  <th>L/P</th>
                  <th>Kelas</th>
                  <th>Akun</th>
                  <th>Status</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <EmptyRow cols={7}>Tidak ada data siswa.</EmptyRow>
                ) : (
                  filtered.map((s) => (
                    <tr key={s._id}>
                      <td>{s.nis} / {s.nisn}</td>
                      <td className="font-medium">{s.fullName}</td>
                      <td>{s.gender}</td>
                      <td>{s.className}</td>
                      <td>
                        <span className={`badge badge-soft badge-sm ${s.hasAccount ? "badge-success" : "badge-ghost"}`}>
                          {s.hasAccount ? "Ada" : "Belum"}
                        </span>
                      </td>
                      <td><ActiveBadge active={s.isActive} /></td>
                      <td className="whitespace-nowrap">
                        <button type="button" onClick={() => openEdit(s)} className="btn btn-ghost btn-xs text-primary">Edit</button>
                        <button type="button" onClick={() => askReset(s._id)} className="btn btn-ghost btn-xs">Reset Akun</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal
        open={open}
        title={editId ? "Edit Siswa" : "Tambah Siswa"}
        onClose={() => setOpen(false)}
        actions={
          <>
            <button type="button" className="btn" onClick={() => setOpen(false)}>Batal</button>
            <button type="button" className="btn btn-primary" onClick={submit} disabled={saving}>
              {saving ? <span className="loading loading-spinner loading-sm" /> : "Simpan"}
            </button>
          </>
        }
      >
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-4">
            <TextField label="NIS" value={values.nis} error={errors.nis} onChange={(e) => set("nis", e.target.value)} />
            <TextField label="NISN" inputMode="numeric" value={values.nisn} error={errors.nisn} onChange={(e) => set("nisn", e.target.value)} />
          </div>
          <TextField label="Nama Lengkap" value={values.fullName} error={errors.fullName} onChange={(e) => set("fullName", e.target.value)} />
          <div className="grid grid-cols-2 gap-4">
            <SelectField label="Jenis Kelamin" value={values.gender} onChange={(e) => set("gender", e.target.value as "L" | "P")}>
              <option value="L">Laki-laki</option>
              <option value="P">Perempuan</option>
            </SelectField>
            <SelectField label="Kelas" value={values.classId} error={errors.classId} onChange={(e) => set("classId", e.target.value)}>
              <option value="">-- Pilih Kelas --</option>
              {activeClasses.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.className} ({c.academicYear})
                </option>
              ))}
            </SelectField>
          </div>
          {editId && (
            <label className="flex items-center gap-2 text-sm cursor-pointer pt-2">
              <input type="checkbox" className="checkbox checkbox-sm checkbox-primary" checked={values.isActive} onChange={(e) => set("isActive", e.target.checked)} />
              <span>Siswa aktif</span>
            </label>
          )}
        </div>
      </Modal>

      <ConfirmDialog
        message={confirm?.message ?? null}
        onCancel={() => setConfirm(null)}
        onOk={() => {
          const c = confirm;
          setConfirm(null);
          void c?.run();
        }}
      />
    </div>
  );
}