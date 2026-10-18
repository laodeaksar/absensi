// Aturan validasi yang dipakai bersama oleh server (Convex) dan form di frontend.
// Setiap fungsi mengembalikan pesan error, atau "" jika valid.

export const vRequired = (value: string, label: string, max = 100): string => {
  const s = value.trim();
  if (!s) return `${label} wajib diisi`;
  if (s.length > max) return `${label} maksimal ${max} karakter`;
  return "";
};

export const vMax = (value: string, label: string, max: number): string =>
  value.trim().length > max ? `${label} maksimal ${max} karakter` : "";

// NIS dipakai sebagai username siswa, jadi minimal 3 karakter (sama dengan aturan login)
export const vNis = (value: string): string => {
  const s = value.trim();
  if (!s) return "NIS wajib diisi";
  if (s.length < 3) return "NIS minimal 3 karakter";
  if (s.length > 20) return "NIS maksimal 20 karakter";
  return "";
};

export const vNisn = (value: string): string => {
  const s = value.trim();
  if (!s) return "NISN wajib diisi";
  return /^\d{10}$/.test(s) ? "" : "NISN harus 10 digit angka";
};

export const vPersonName = (value: string): string => {
  const s = value.trim();
  if (!s) return "Nama lengkap wajib diisi";
  if (s.length < 3) return "Nama minimal 3 karakter";
  if (s.length > 100) return "Nama maksimal 100 karakter";
  return "";
};

export const vUsername = (value: string): string => {
  const s = value.trim();
  if (!s) return "Username wajib diisi";
  return /^[A-Za-z0-9._-]{3,30}$/.test(s)
    ? ""
    : "3-30 karakter: huruf, angka, titik, garis bawah, atau strip";
};

export const vPassword = (value: string, required: boolean): string => {
  if (!value) return required ? "Password wajib diisi" : "";
  return value.length < 6 ? "Password minimal 6 karakter" : "";
};

export const vNip = (value: string): string => {
  const s = value.trim();
  return s && !/^[0-9]{5,30}$/.test(s) ? "NIP hanya angka (5-30 digit)" : "";
};

export const vPhone = (value: string): string => {
  const s = value.trim();
  return s && !/^[0-9+][0-9\s-]{5,19}$/.test(s) ? "Nomor HP tidak valid" : "";
};

export const vEmail = (value: string): string => {
  const s = value.trim();
  return s && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s) ? "Format email tidak valid" : "";
};

export const vAcademicYear = (value: string, required = true): string => {
  const s = value.trim();
  if (!s) return required ? "Tahun ajaran wajib diisi" : "";
  const m = /^(\d{4})\/(\d{4})$/.exec(s);
  return !m || Number(m[2]) !== Number(m[1]) + 1 ? "Format harus 2025/2026" : "";
};

export const vDate = (value: string): string =>
  /^\d{4}-\d{2}-\d{2}$/.test(value) ? "" : "Format tanggal tidak valid";

export const vEditWindow = (value: string): string => {
  const s = value.trim();
  if (!s) return "";
  return /^\d{1,3}$/.test(s) && Number(s) <= 365 ? "" : "Isi angka 0 sampai 365";
};