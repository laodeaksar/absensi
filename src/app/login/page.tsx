"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { CircleAlert, Eye, EyeOff, Lock, School, User } from "lucide-react";
import { api } from "@convex/_generated/api";
import { useAuth } from "@/components/AuthProvider";
import { errMsg } from "@/lib/errors";

type Errs = { username?: string; password?: string };

function ErrorText({ msg }: { msg?: string }) {
  if (!msg) return null;
  return (
    <p role="alert" className="flex items-center gap-1 mt-1 text-xs text-error">
      <CircleAlert className="size-3.5 shrink-0" />
      <span>{msg}</span>
    </p>
  );
}

export default function LoginPage() {
  const { user, ready, login } = useAuth();
  const router = useRouter();
  const pub = useQuery(api.settings.getPublic, {});
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [errs, setErrs] = useState<Errs>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (ready && user) router.replace("/");
  }, [ready, user, router]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const u = username.trim();
    const next: Errs = {};
    if (!u) next.username = "Username wajib diisi";
    else if (u.length < 3) next.username = "Username minimal 3 karakter";
    if (!password) next.password = "Password wajib diisi";
    else if (password.length < 6) next.password = "Password minimal 6 karakter";
    setErrs(next);
    if (next.username || next.password) return;

    setBusy(true);
    try {
      await login(u, password);
    } catch (err) {
      setErrs({ password: errMsg(err) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <div className="card bg-base-100 shadow-xl w-full max-w-md">
        <div className="card-body p-8">
          <div className="text-center mb-4">
            <div className="inline-flex items-center justify-center size-16 rounded-full bg-primary/10 text-primary mb-4">
              <School className="size-8" />
            </div>
            <h1 className="text-2xl font-bold">{pub?.schoolName ?? "EduAbsen"}</h1>
            <p className="text-sm text-base-content/60 mt-1">Sistem Manajemen Kehadiran Siswa</p>
          </div>

          <form onSubmit={onSubmit} className="space-y-4" noValidate>
            <fieldset className="fieldset">
              <legend className="fieldset-legend">Username</legend>
              <label className={`input w-full ${errs.username ? "input-error" : ""}`}>
                <User className="size-4 opacity-50" />
                <input
                  type="text"
                  autoComplete="username"
                  placeholder="Username (siswa: NIS)"
                  value={username}
                  aria-invalid={!!errs.username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    setErrs((p) => ({ ...p, username: undefined }));
                  }}
                />
              </label>
              <ErrorText msg={errs.username} />
            </fieldset>

            <fieldset className="fieldset">
              <legend className="fieldset-legend">Password</legend>
              <label className={`input w-full ${errs.password ? "input-error" : ""}`}>
                <Lock className="size-4 opacity-50" />
                <input
                  type={show ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="Masukkan password"
                  value={password}
                  aria-invalid={!!errs.password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setErrs((p) => ({ ...p, password: undefined }));
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShow((s) => !s)}
                  aria-label={show ? "Sembunyikan password" : "Tampilkan password"}
                  className="btn btn-ghost btn-xs btn-circle"
                >
                  {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </label>
              <ErrorText msg={errs.password} />
            </fieldset>

            <button type="submit" disabled={busy} className="btn btn-primary w-full">
              {busy ? <span className="loading loading-spinner loading-sm" /> : "Masuk"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}