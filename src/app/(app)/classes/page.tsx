"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Plus, Search } from "lucide-react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { vAcademicYear, vRequired } from "@convex/validators";
import { useAuth } from "@/components/AuthProvider";
import { useToast } from "@/components/Toast";
import { ActiveBadge, EmptyRow, Modal, SelectField, Spinner, TextField } from "@/components/ui";
import { errMsg } from "@/lib/errors";
import { collectErrors, useForm } from "@/lib/useForm";
import { useRoleGuard } from "@/lib/useRoleGuard";

type Form = {
  className: string;
  gradeLevel: string;
  academicYear: string;
  homeroomTeacher: string;
  isActive: boolean;
};
const EMPTY: Form = { className: "", gradeLevel: "", academicYear: "", homeroomTeacher: "", isActive: true };

export default function ClassesPage() {
  const allowed = useRoleGuard(["admin"]);
  const { token } = useAuth();
  const { toast } = useToast();

  const classes = useQuery(api.classes.list, token && allowed ? { token } : "skip");
  const teachers = useQuery(api.teachers.list, token && allowed ? { token } : "skip");
  const settings = useQuery(api.settings.get, token && allowed ? { token } : "skip");
  const save = useMutation(api.classes.save);

  const { values, errors, set, setErrors, reset } = useForm<Form>(EMPTY);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<Id<"classes"> | null>(null);
  const [query, setQuery] = useState("");
  const [saving, setSaving] = useState(false);

  if (!allowed) return null;

  function openAdd() {
    reset({ ...EMPTY, academicYear: settings?.activeAcademicYear ?? "" });
    setEditId(null);
    setOpen(true);
  }

  function openEdit(c: NonNullable<typeof classes>[number]) {
    reset({
      className: c.className,
      gradeLevel: c.gradeLevel,
      academicYear: c.academicYear,
      homeroomTeacher: c.homeroomTeacher ?? "",
      isActive: c.isActive,
    });
    setEditId(c._id);
    setOpen(true);
  }

  async function submit() {
    if (!token) return;
    const { errors: found, hasError } = collectErrors<Form>({
      className: vRequired(values.className, "Nama kelas", 50),
      gradeLevel: vRequired(values.gradeLevel, "Tingkat", 20),
      academicYear: vAcademicYear(values.academicYear),
    });
    if (hasError) return setErrors(found);

    setSaving(true);
    try {
      await save({
        token,
        id: editId ?? undefined,
        className: values.className,
        gradeLevel: values.gradeLevel,
        academicYear: values.academicYear,
        homeroomTeacher: values.homeroomTeacher ? (values.homeroomTeacher as Id<"users">) : undefined,
        isActive: editId ? values.isActive : undefined,
      });
      toast("Kelas tersimpan", "success");
      setOpen(false);
    } catch (err) {
      const msg = errMsg(err);
      if (/Nama kelas/i.test(msg)) setErrors({ className: msg });
      else if (/Wali kelas/i.test(msg)) setErrors({ homeroomTeacher: msg });
      else if (/Tahun ajaran|Format harus/i.test(msg)) setErrors({ academicYear: msg });
      else toast(msg, "error");
    } finally {
      setSaving(false);
    }
  }

  const q = query.trim().toLowerCase();
  const filtered = (classes ?? []).filter((c) => !q || c.className.toLowerCase().includes(q));
  const activeTeachers = (teachers ?? []).filter((t) => t.isActive || t._id === values.homeroomTeacher);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Master Data Kelas</h2>
        <button type="button" onClick={openAdd} className="btn btn-primary btn-sm">
          <Plus className="size-4" /> Tambah Kelas
        </button>
      </div>

      <div className="card bg-base-100 border border-base-300 overflow-hidden">
        <div className="p-4 border-b border-base-300 bg-base-200/60">
          <label className="input input-sm w-full max-w-xs">
            <Search className="size-4 opacity-50" />
            <input type="search" placeholder="Cari kelas..." value={query} onChange={(e) => setQuery(e.target.value)} />
          </label>
        </div>

        {classes === undefined ? (
          <Spinner />
        ) : (
          <div className="overflow-x-auto">
            <table className="table table-zebra">
              <thead>
                <tr>
                  <th>Nama Kelas</th>
                  <th>Tingkat</th>
                  <th>Tahun Ajaran</th>
                  <th>Wali Kelas</th>
                  <th>Status</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <EmptyRow cols={6}>Tidak ada data kelas.</EmptyRow>
                ) : (
                  filtered.map((c) => (
                    <tr key={c._id}>
                      <td className="font-medium">{c.className}</td>
                      <td>{c.gradeLevel}</td>
                      <td>{c.academicYear}</td>
                      <td>{c.homeroomName}</td>
                      <td><ActiveBadge active={c.isActive} /></td>
                      <td>
                        <button type="button" onClick={() => openEdit(c)} className="btn btn-ghost btn-xs text-primary">Edit</button>
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
        title={editId ? "Edit Kelas" : "Tambah Kelas"}
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
          <TextField label="Nama Kelas" placeholder="Misal: X MIPA 1" value={values.className} error={errors.className} onChange={(e) => set("className", e.target.value)} />
          <SelectField label="Wali Kelas" value={values.homeroomTeacher} error={errors.homeroomTeacher} onChange={(e) => set("homeroomTeacher", e.target.value)}>
            <option value="">-- Tanpa Wali Kelas --</option>
            {activeTeachers.map((t) => (
              <option key={t._id} value={t._id}>{t.fullName}</option>
            ))}
          </SelectField>
          <div className="grid grid-cols-2 gap-4">
            <TextField label="Tingkat" placeholder="X" value={values.gradeLevel} error={errors.gradeLevel} onChange={(e) => set("gradeLevel", e.target.value)} />
            <TextField label="Tahun Ajaran" placeholder="2025/2026" value={values.academicYear} error={errors.academicYear} onChange={(e) => set("academicYear", e.target.value)} />
          </div>
          {editId && (
            <label className="flex items-center gap-2 text-sm cursor-pointer pt-2">
              <input type="checkbox" className="checkbox checkbox-sm checkbox-primary" checked={values.isActive} onChange={(e) => set("isActive", e.target.checked)} />
              <span>Kelas aktif</span>
            </label>
          )}
        </div>
      </Modal>
    </div>
  );
}