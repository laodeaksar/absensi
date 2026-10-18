import { ConvexError, v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";

// ---------- Tipe & validator bersama ----------
export type Role = "admin" | "guru" | "siswa";
export const roleValidator = v.union(v.literal("admin"), v.literal("guru"), v.literal("siswa"));
export const statusValidator = v.union(
  v.literal("Hadir"),
  v.literal("Sakit"),
  v.literal("Izin"),
  v.literal("Alpa"),
);
export const genderValidator = v.union(v.literal("L"), v.literal("P"));

export type PublicUser = {
  id: Id<"users">;
  username: string;
  fullName: string;
  role: Role;
  studentId: Id<"students"> | null;
  mustChangePassword: boolean;
};

export function publicUser(u: Doc<"users">): PublicUser {
  return {
    id: u._id,
    username: u.username,
    fullName: u.fullName,
    role: u.role,
    studentId: u.studentId ?? null,
    mustChangePassword: u.mustChangePassword,
  };
}

// ---------- Error & waktu ----------
// Pesan error pengguna HARUS memakai ConvexError agar terbaca di production.
export function fail(message: string): never {
  throw new ConvexError(message);
}

export function assertValid(...errors: string[]): void {
  const first = errors.find(Boolean);
  if (first) fail(first);
}

export const SESSION_TTL_MS = 6 * 60 * 60 * 1000; // 6 jam
export const TZ_OFFSET_HOURS = 7; // WIB. Ubah ke 8 (WITA) atau 9 (WIT) bila perlu.

// Tanggal hari ini (yyyy-MM-dd) di zona waktu sekolah, dengan geser hari opsional
export function todayStr(offsetDays = 0): string {
  const ms = Date.now() + TZ_OFFSET_HOURS * 3600 * 1000 + offsetDays * 86400 * 1000;
  return new Date(ms).toISOString().slice(0, 10);
}

// ---------- Kriptografi (Web Crypto) ----------
const enc = new TextEncoder();

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function randomHex(bytes = 16): string {
  const a = new Uint8Array(bytes);
  crypto.getRandomValues(a);
  return toHex(a);
}

export async function sha256Hex(text: string): Promise<string> {
  return toHex(new Uint8Array(await crypto.subtle.digest("SHA-256", enc.encode(text))));
}

// PBKDF2-SHA256, 100.000 iterasi, salt unik per akun
export async function hashPassword(password: string, saltHex: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, [
    "deriveBits",
  ]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: enc.encode(saltHex), iterations: 100_000 },
    key,
    256,
  );
  return toHex(new Uint8Array(bits));
}

export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

// ---------- Sesi & otorisasi ----------
export async function getSessionUser(
  ctx: QueryCtx,
  token: string | undefined,
): Promise<Doc<"users"> | null> {
  if (!token) return null;
  const tokenHash = await sha256Hex(token);
  const session = await ctx.db
    .query("sessions")
    .withIndex("by_token", (q) => q.eq("tokenHash", tokenHash))
    .unique();
  if (!session || session.expiresAt < Date.now()) return null;
  const user = await ctx.db.get(session.userId);
  if (!user || !user.isActive) return null;
  return user;
}

// Wajib menyebut peran yang diizinkan. Siswa tidak pernah lolos kecuali disebut eksplisit.
export async function requireUser(
  ctx: QueryCtx,
  token: string,
  roles: Role[],
): Promise<Doc<"users">> {
  const user = await getSessionUser(ctx, token);
  if (!user) fail("AUTH_FAILED");
  if (!roles.includes(user.role)) fail("FORBIDDEN");
  return user;
}

export async function deleteUserSessions(ctx: MutationCtx, userId: Id<"users">): Promise<void> {
  const sessions = await ctx.db
    .query("sessions")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();
  for (const s of sessions) await ctx.db.delete(s._id);
}

export function assertClassAccess(user: Doc<"users">, classId: Id<"classes">): void {
  if (user.role === "guru" && !user.assignedClasses.includes(classId)) {
    fail("Anda tidak memiliki akses ke kelas ini.");
  }
}

// ---------- Pengaturan aplikasi ----------
export type AppSettings = {
  schoolName: string;
  schoolAddress: string;
  principalName: string;
  principalNip: string;
  activeAcademicYear: string;
  editWindowDays: number; // 0 = guru boleh mengubah absensi tanggal berapa pun
};

export const SETTING_KEYS = [
  "schoolName",
  "schoolAddress",
  "principalName",
  "principalNip",
  "activeAcademicYear",
  "editWindowDays",
] as const;
export type SettingKey = (typeof SETTING_KEYS)[number];

const DEFAULTS: Record<SettingKey, string> = {
  schoolName: "EduAbsen",
  schoolAddress: "",
  principalName: "",
  principalNip: "",
  activeAcademicYear: "",
  editWindowDays: "0",
};

export async function getSettings(ctx: QueryCtx): Promise<AppSettings> {
  const map: Record<SettingKey, string> = { ...DEFAULTS };
  const rows = await ctx.db.query("settings").collect();
  for (const r of rows) {
    if ((SETTING_KEYS as readonly string[]).includes(r.key)) map[r.key as SettingKey] = r.value;
  }
  return {
    schoolName: map.schoolName || DEFAULTS.schoolName,
    schoolAddress: map.schoolAddress,
    principalName: map.principalName,
    principalNip: map.principalNip,
    activeAcademicYear: map.activeAcademicYear,
    editWindowDays: Number(map.editWindowDays) || 0,
  };
}