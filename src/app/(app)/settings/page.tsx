"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { vAcademicYear, vEditWindow, vMax, vNip, vRequired } from "@convex/validators";
import { useAuth } from "@/components/AuthProvider";
import { useToast } from "@/components/Toast";
import { TextField } from "@/components/ui";
import { errMsg } from "@/lib/errors";
import { collectErrors, useForm } from "@/lib/useForm";

type SchoolForm = {
  schoolName: string;
  schoolAddress: string;
  principalName: string;
  principalNip: string;
  activeAcademicYear: string;
  editWindowDays: string;
};
type PwForm = { oldPw: string; newPw: string; confirmPw: string };

const ROLE_LABEL = { admin: "Administrator", guru: "Guru", siswa: "Siswa" } as const;

export default function SettingsPage() {
  const { token, user, logout } = useAuth();
  const { toast } = useToast();
  const isAdmin = user?.role === "admin";

  const settings = useQuery(api.settings.get, token ? { token } : "skip");
  const saveSettings = useMutation(api.settings.save);
  const changePassword = useMutation(api.auth.changePassword);

  const school = useForm<SchoolForm>({
    schoolName: "",
    schoolAddress: "",
    principalName: "",
    principalNip: "",
    activeAcademicYear: "",
    editWindowDays: "0",
  });
  const pw = useForm<PwForm>({ oldPw: "", newPw: "", confirmPw: "" });
  const [savingSchool, setSavingSchool] = useState(false);
  const [savingPw, setSavingPw] = useState(false);

  const resetSchool = school.reset;
  useEffect(() => {
    if (!settings) return;
    resetSchool({
      schoolName: settings.schoolName,
      schoolAddress: settings.schoolAddress,
      principalName: settings.principalName,
      principalNip: settings.principalNip,
      activeAcademicYear: settings.activeAcademicYear,
      editWindowDays: String(settings.editWindowDays),
    });
  }, [settings, resetSchool]);

  async function submitSchool() {
    if (!token) return;
    const v = school.values;
    const { errors, hasError } = collectErrors<SchoolForm>({
      schoolName: vRequired(v.schoolName, "Nama sekolah", 100),
      schoolAddress: vMax(v.schoolAddress, "Alamat sekolah", 200),
      principalName: vMax(v.principalName, "Nama kepala sekolah", 100),
      principalNip: vNip(v.principalNip),
      activeAcademicYear: vAcademicYear(v.activeAcademicYear, false),
      editWindowDays: vEditWindow(v.editWindowDays),
    });
    if (hasError) return school.setErrors(errors);

    setSavingSchool(true);
    try {
      await saveSettings({ token, ...v, editWindowDays: v.editWindowDays.trim() || "0" });
      toast("Pengaturan berhasil disimpan", "success");
    } catch (err) {
      toast(errMsg(err), "error");
    } finally {
      setSavingSchool(false);
    }
  }

  async function submitPassword() {
    if (!token) return;
    const v = pw.values;
    const { errors, hasError } = collectErrors<PwForm>({
      oldPw: v.oldPw ? "" : "Password lama wajib diisi",
      newPw: !v.newPw
        ? "Password baru wajib diisi"
        : v.newPw.length < 6
          ? "Minimal 6 karakter"
          : v.newPw === v.oldPw
            ? "Harus berbeda dari password lama"
            : "",
      confirmPw: v.confirmPw === v.newPw ? "" : "Konfirmasi tidak sama dengan password baru",
    });
    if (hasError) return pw.setErrors(errors);

    setSavingPw(true);
    try {
      await changePassword({ token, oldPassword: v.oldPw, newPassword: v.newPw });
      toast("Password diubah. Silakan login kembali.", "success");
      await logout();
    } catch (err) {
      const msg = errMsg(err);
      if (/Password lama/i.test(msg)) pw.setErrors({ oldPw: msg });
      else if (/Password baru/i.test(msg)) pw.setErrors({ newPw: msg });
      else toast(msg, "error");
    } finally {
      setSavingPw(false);
    }
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Pengaturan</h2>

      {user?.mustChangePassword && (
        <div role="alert" className="alert alert-warning">
          <span>Demi keamanan, ganti password bawaan Anda sebelum melanjutkan.</span>
        </div>
      )}

      {isAdmin && (
        <>
          <div className="card bg-base-100 border border-base-300">
            <div className="card-body">
              <h3 className="card-title text-base">Data Sekolah</h3>
              <p className="text-sm text-base-content/60">Dipakai pada judul aplikasi dan kop laporan cetak.</p>
              <div className="space-y-2 max-w-2xl">
                <TextField label="Nama Sekolah" maxLength={100} value={school.values.schoolName} error={school.errors.schoolName} onChange={(e) => school.set("schoolName", e.target.value)} />
                <TextField label="Alamat Sekolah" maxLength={200} value={school.values.schoolAddress} error={school.errors.schoolAddress} onChange={(e) => school.set("schoolAddress", e.target.value)} />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <TextField label="Nama Kepala Sekolah" maxLength={100} value={school.values.principalName} error={school.errors.principalName} onChange={(e) => school.set("principalName", e.target.value)} />
                  <TextField label="NIP Kepala Sekolah" inputMode="numeric" value={school.values.principalNip} error={school.errors.principalNip} onChange={(e) => school.set("principalNip", e.target.value)} />
                </div>
              </div>
            </div>
          </div>

          <div className="card bg-base-100 border border-base-300">
            <div className="card-body">
              <h3 className="card-title text-base">Absensi</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
                <TextField
                  label="Tahun Ajaran Aktif"
                  placeholder="2025/2026"
                  hint="Terisi otomatis saat menambah kelas baru."
                  value={school.values.activeAcademicYear}
                  error={school.errors.activeAcademicYear}
                  onChange={(e) => school.set("activeAcademicYear", e.target.value)}
                />
                <TextField
                  label="Batas Edit Absensi Guru (hari)"
                  type="number"
                  min={0}
                  max={365}
                  inputMode="numeric"
                  hint="0 = tanpa batas. Admin tidak dibatasi."
                  value={school.values.editWindowDays}
                  error={school.errors.editWindowDays}
                  onChange={(e) => school.set("editWindowDays", e.target.value)}
                />
              </div>
              <div className="card-actions mt-2">
                <button type="button" onClick={submitSchool} disabled={savingSchool} className="btn btn-primary">
                  {savingSchool ? <span className="loading loading-spinner loading-sm" /> : "Simpan Pengaturan"}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      <div className="card bg-base-100 border border-base-300">
        <div className="card-body">
          <h3 className="card-title text-base">Akun Saya</h3>
          {user && (
            <p className="text-sm text-base-content/60">
              {user.fullName} ({user.username}) - {ROLE_LABEL[user.role]}
            </p>
          )}
          <div className="space-y-2 max-w-md">
            <TextField label="Password Lama" type="password" autoComplete="current-password" value={pw.values.oldPw} error={pw.errors.oldPw} onChange={(e) => pw.set("oldPw", e.target.value)} />
            <TextField label="Password Baru" type="password" autoComplete="new-password" placeholder="Minimal 6 karakter" value={pw.values.newPw} error={pw.errors.newPw} onChange={(e) => pw.set("newPw", e.target.value)} />
            <TextField label="Ulangi Password Baru" type="password" autoComplete="new-password" value={pw.values.confirmPw} error={pw.errors.confirmPw} onChange={(e) => pw.set("confirmPw", e.target.value)} />
          </div>
          <div className="card-actions mt-2">
            <button type="button" onClick={submitPassword} disabled={savingPw} className="btn btn-primary">
              {savingPw ? <span className="loading loading-spinner loading-sm" /> : "Ubah Password"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}