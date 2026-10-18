"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Plus, Search } from "lucide-react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { vEmail, vNip, vPassword, vPhone, vRequired, vUsername } from "@convex/validators";
import { useAuth } from "@/components/AuthProvider";
import { useToast } from "@/components/Toast";
import { ActiveBadge, EmptyRow, Modal, Spinner, TextField } from "@/components/ui";
import { errMsg } from "@/lib/errors";
import { collectErrors, useForm } from "@/lib/useForm";
import { useRoleGuard } from "@/lib/useRoleGuard";

type Form = {
  fullName: string;
  username: string;
  password: string;
  nip: string;
  phone: string;
  email: string;
  assigned: string[];
  isActive: boolean;
};
const EMPTY: Form = {
  fullName: "",
  username: "",
  password: "",
  nip: "",
  phone: "",
  email: "",
  assigned: [],
  isActive: true,
};

export default function TeachersPage() {
  const allowed = useRoleGuard(["admin"]);
  const { token } = useAuth();
  const { toast } = useToast();

  const teachers = useQuery(api.teachers.list, token && allowed ? { token } : "skip");
  const classes = useQuery(api.classes.list, token && allowed ? { token } : "skip");
  const save = useMutation(api.teachers.save);

  const { values, errors, set, setErrors, reset } = useForm<Form>(EMPTY);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<Id<"users"> | null>(null);
  const [query, setQuery] = useState("");
  const [saving, setSaving] = useState(false);

  if (!allowed) return null;

  function openAdd() {
    reset(EMPTY);
    setEditId(null);
    setOpen(true);
  }

  function openEdit(t: NonNullable<typeof teachers>[number]) {
    reset({
      fullName: t.fullName,
      username: t.username,
      password: "",
      nip: t.nip,
      phone: t.phone,
      email: t.email,
      assigned: t.assignedClassIds,
      isActive: t.isActive,
    });
    setEditId(t._id);
    setOpen(true);
  }

  async function submit() {
    if (!token) return;
    const { errors: found, hasError } = collectErrors<Form>({
      fullName: vRequired(values.fullName, "Nama lengkap", 100),
      username: vUsername(values.username),
      password: vPassword(values.password, !editId).replace("Password wajib diisi", "Password wajib diisi untuk guru baru"),
      nip: vNip(values.nip),
      phone: vPhone(values.phone),
      email: vEmail(values.email),
    });
    if (hasError) return setErrors(found);

    setSaving(true);
    try {
      await save({
        token,
        id: editId ?? undefined,
        fullName: values.fullName,
        username: values.username,
        nip: values.nip,
        phone: values.phone,
        email: values.email,
        password: values.password || undefined,
        assignedClasses: values.assigned as Id<"classes">[],
        isActive: values.isActive,
      });
      toast("Data guru tersimpan", "success");
      setOpen(false);
    } catch (err) {
      const msg = errMsg(err);
      if (/Username/i.test(msg)) setErrors({ username: msg });
      else if (/NIP/i.test(msg)) setErrors({ nip: msg });
      else if (/HP/i.test(msg)) setErrors({ phone: msg });
      else if (/email/i.test(msg)) setErrors({ email: msg });
      else if (/Password/i.test(msg)) setErrors({ password: msg });
      else if (/Nama lengkap/i.test(msg)) setErrors({ fullName: msg });
      else toast(msg, "error");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(t: NonNullable<typeof teachers>[number]) {
    if (!token) return;
    try {
      await save({ token, id: t._id, isActive: !t.isActive });
      toast(t.isActive ? "Akun guru dinonaktifkan" : "Akun guru diaktifkan", "success");
    } catch (err) {
      toast(errMsg(err), "error");
    }
  }

  const toggleClass = (id: string) =>
    set("assigned", values.assigned.includes(id) ? values.assigned.filter((x) => x !== id) : [...values.assigned, id]);

  const q = query.trim().toLowerCase();
  const filtered = (teachers ?? []).filter(
    (t) => !q || t.fullName.toLowerCase().includes(q) || t.username.toLowerCase().includes(q),
  );
  const visibleClasses = (classes ?? []).filter((c) => c.isActive || values.assigned.includes(c._id));

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Manajemen Guru</h2>
        <button type="button" onClick={openAdd} className="btn btn-primary btn-sm">
          <Plus className="size-4" /> Tambah Guru
        </button>
      </div>

      <div className="card bg-base-100 border border-base-300 overflow-hidden">
        <div className="p-4 border-b border-base-300 bg-base-200/60">
          <label className="input input-sm w-full max-w-xs">
            <Search className="size-4 opacity-50" />
            <input type="search" placeholder="Cari nama atau username..." value={query} onChange={(e) => setQuery(e.target.value)} />
          </label>
        </div>

        {teachers === undefined ? (
          <Spinner />
        ) : (
          <div className="overflow-x-auto">
            <table className="table table-zebra">
              <thead>
                <tr>
                  <th>Nama Lengkap</th>
                  <th>Username</th>
                  <th>Kontak</th>
                  <th>Kelas Diampu</th>
                  <th>Status</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <EmptyRow cols={6}>Belum ada data guru.</EmptyRow>
                ) : (
                  filtered.map((t) => (
                    <tr key={t._id}>
                      <td>
                        <div className="font-medium">{t.fullName}</div>
                        {t.nip && <div className="text-xs text-base-content/60">NIP {t.nip}</div>}
                      </td>
                      <td>{t.username}</td>
                      <td>
                        {t.phone || t.email ? (
                          <>
                            {t.phone && <div>{t.phone}</div>}
                            {t.email && <div className="text-xs text-base-content/60">{t.email}</div>}
                          </>
                        ) : (
                          <span className="text-base-content/40">-</span>
                        )}
                      </td>
                      <td>
                        {t.assignedClassNames.length > 0 ? (
                          t.assignedClassNames.map((n) => (
                            <span key={n} className="badge badge-ghost badge-sm mr-1 mb-1">{n}</span>
                          ))
                        ) : (
                          <span className="text-base-content/40">-</span>
                        )}
                      </td>
                      <td><ActiveBadge active={t.isActive} /></td>
                      <td className="whitespace-nowrap">
                        <button type="button" onClick={() => openEdit(t)} className="btn btn-ghost btn-xs text-primary">Edit</button>
                        <button
                          type="button"
                          onClick={() => toggleActive(t)}
                          className={`btn btn-ghost btn-xs ${t.isActive ? "text-error" : "text-success"}`}
                        >
                          {t.isActive ? "Nonaktifkan" : "Aktifkan"}
                        </button>
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
        title={editId ? "Edit Guru" : "Tambah Guru"}
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
          <TextField label="Nama Lengkap" value={values.fullName} error={errors.fullName} onChange={(e) => set("fullName", e.target.value)} />
          <div className="grid grid-cols-2 gap-4">
            <TextField label="NIP" inputMode="numeric" value={values.nip} error={errors.nip} onChange={(e) => set("nip", e.target.value)} />
            <TextField label="No. HP" inputMode="tel" value={values.phone} error={errors.phone} onChange={(e) => set("phone", e.target.value)} />
          </div>
          <TextField label="Email" type="email" value={values.email} error={errors.email} onChange={(e) => set("email", e.target.value)} />
          <div className="grid grid-cols-2 gap-4">
            <TextField label="Username" autoComplete="off" value={values.username} error={errors.username} onChange={(e) => set("username", e.target.value)} />
            <TextField
              label="Password"
              type="password"
              autoComplete="new-password"
              placeholder={editId ? "Kosongkan jika tidak diubah" : "Minimal 6 karakter"}
              value={values.password}
              error={errors.password}
              onChange={(e) => set("password", e.target.value)}
            />
          </div>

          <fieldset className="fieldset">
            <legend className="fieldset-legend">Kelas yang Diampu</legend>
            <div className="space-y-2 max-h-40 overflow-y-auto border border-base-300 rounded-box p-3">
              {visibleClasses.length === 0 ? (
                <p className="text-sm text-base-content/60">Belum ada kelas aktif.</p>
              ) : (
                visibleClasses.map((c) => (
                  <label key={c._id} className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      className="checkbox checkbox-sm checkbox-primary"
                      checked={values.assigned.includes(c._id)}
                      onChange={() => toggleClass(c._id)}
                    />
                    <span>
                      {c.className} <span className="text-base-content/40">({c.academicYear})</span>
                    </span>
                  </label>
                ))
              )}
            </div>
          </fieldset>

          <label className="flex items-center gap-2 text-sm cursor-pointer pt-2">
            <input type="checkbox" className="checkbox checkbox-sm checkbox-primary" checked={values.isActive} onChange={(e) => set("isActive", e.target.checked)} />
            <span>Akun aktif (dapat login)</span>
          </label>
        </div>
      </Modal>
    </div>
  );
}