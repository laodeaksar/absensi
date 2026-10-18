import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import { action, internalMutation, internalQuery, mutation, query } from "./_generated/server";
import {
  assertValid,
  fail,
  hashPassword,
  randomHex,
  requireUser,
  todayStr,
  deleteUserSessions,
} from "./lib";
import { vDate } from "./validators";

// ---------- Admin: akun siswa (username = NIS, password awal = NISN) ----------

export const listNeedingAccount = internalQuery({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    await requireUser(ctx, token, ["admin"]);
    const [students, siswaUsers] = await Promise.all([
      ctx.db.query("students").collect(),
      ctx.db
        .query("users")
        .withIndex("by_role", (q) => q.eq("role", "siswa"))
        .collect(),
    ]);
    const has = new Set<string>();
    for (const u of siswaUsers) if (u.studentId) has.add(u.studentId);
    return students
      .filter((s) => s.isActive && !has.has(s._id))
      .map((s) => ({ id: s._id, nis: s.nis.trim(), nisn: s.nisn.trim(), fullName: s.fullName }));
  },
});

export const insertAccounts = internalMutation({
  args: {
    items: v.array(
      v.object({
        studentId: v.id("students"),
        username: v.string(),
        fullName: v.string(),
        passwordHash: v.string(),
        passwordSalt: v.string(),
      }),
    ),
  },
  handler: async (ctx, { items }) => {
    let created = 0;
    const skipped: string[] = [];
    for (const it of items) {
      const lower = it.username.toLowerCase();
      const taken = await ctx.db
        .query("users")
        .withIndex("by_username", (q) => q.eq("usernameLower", lower))
        .unique();
      if (taken) {
        skipped.push(`${it.username}: username sudah dipakai akun lain`);
        continue;
      }
      await ctx.db.insert("users", {
        username: it.username,
        usernameLower: lower,
        passwordHash: it.passwordHash,
        passwordSalt: it.passwordSalt,
        fullName: it.fullName,
        role: "siswa",
        assignedClasses: [],
        isActive: true,
        studentId: it.studentId,
        mustChangePassword: true,
      });
      created++;
    }
    return { created, skipped };
  },
});

// Action (bukan mutation) karena hashing ratusan password terlalu berat untuk satu mutation
export const generateAccounts = action({
  args: { token: v.string() },
  handler: async (ctx, { token }): Promise<{ created: number; skipped: string[] }> => {
    const students: { id: Id<"students">; nis: string; nisn: string; fullName: string }[] =
      await ctx.runQuery(internal.studentPortal.listNeedingAccount, { token });

    const skipped: string[] = [];
    const items: {
      studentId: Id<"students">;
      username: string;
      fullName: string;
      passwordHash: string;
      passwordSalt: string;
    }[] = [];

    for (const s of students) {
      if (s.nis.length < 3) {
        skipped.push(`${s.fullName}: NIS kurang dari 3 karakter`);
        continue;
      }
      if (s.nisn.length < 6) {
        skipped.push(`${s.nis}: NISN kosong/kurang dari 6 karakter`);
        continue;
      }
      const salt = randomHex(16);
      items.push({
        studentId: s.id,
        username: s.nis,
        fullName: s.fullName,
        passwordSalt: salt,
        passwordHash: await hashPassword(s.nisn, salt),
      });
    }

    let created = 0;
    for (let i = 0; i < items.length; i += 25) {
      const res: { created: number; skipped: string[] } = await ctx.runMutation(
        internal.studentPortal.insertAccounts,
        { items: items.slice(i, i + 25) },
      );
      created += res.created;
      skipped.push(...res.skipped);
    }
    return { created, skipped };
  },
});

// Buat akun satu siswa, atau reset password-nya ke NISN
export const resetAccount = mutation({
  args: { token: v.string(), studentId: v.id("students") },
  handler: async (ctx, { token, studentId }) => {
    await requireUser(ctx, token, ["admin"]);
    const student = await ctx.db.get(studentId);
    if (!student) fail("Data siswa tidak ditemukan.");
    const nis = student.nis.trim();
    const nisn = student.nisn.trim();
    if (nisn.length < 6) fail("NISN siswa kosong atau terlalu pendek untuk dijadikan password awal.");

    const salt = randomHex(16);
    const passwordHash = await hashPassword(nisn, salt);

    const acct = await ctx.db
      .query("users")
      .withIndex("by_student", (q) => q.eq("studentId", studentId))
      .unique();
    if (acct) {
      await ctx.db.patch(acct._id, { passwordSalt: salt, passwordHash, mustChangePassword: true });
      await deleteUserSessions(ctx, acct._id);
      return { message: "Password siswa direset ke NISN." };
    }

    if (nis.length < 3) fail("NIS kurang dari 3 karakter, tidak bisa dijadikan username.");
    const taken = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("usernameLower", nis.toLowerCase()))
      .unique();
    if (taken) fail("Username (NIS) sudah dipakai akun lain.");

    await ctx.db.insert("users", {
      username: nis,
      usernameLower: nis.toLowerCase(),
      passwordHash,
      passwordSalt: salt,
      fullName: student.fullName,
      role: "siswa",
      assignedClasses: [],
      isActive: true,
      studentId,
      mustChangePassword: true,
    });
    return { message: "Akun siswa dibuat. Username = NIS, password awal = NISN." };
  },
});

// ---------- Siswa: lihat kehadiran sendiri ----------
// studentId diambil dari sesi, bukan dari parameter, sehingga tidak bisa melihat data siswa lain.
export const myAttendance = query({
  args: { token: v.string(), startDate: v.string(), endDate: v.string() },
  handler: async (ctx, { token, startDate, endDate }) => {
    const user = await requireUser(ctx, token, ["siswa"]);
    if (!user.studentId) fail("Akun ini belum terhubung ke data siswa.");
    assertValid(vDate(startDate), vDate(endDate));
    if (startDate > endDate) fail("Tanggal awal tidak boleh melebihi tanggal akhir.");

    const studentId = user.studentId;
    const student = await ctx.db.get(studentId);
    if (!student) fail("Data siswa tidak ditemukan.");

    const [histories, classes, all] = await Promise.all([
      ctx.db
        .query("studentClassHistory")
        .withIndex("by_student", (q) => q.eq("studentId", studentId))
        .collect(),
      ctx.db.query("classes").collect(),
      ctx.db
        .query("attendance")
        .withIndex("by_student_date", (q) => q.eq("studentId", studentId))
        .collect(),
    ]);

    const classMap = new Map<string, string>();
    for (const c of classes) classMap.set(c._id, c.className);
    const className =
      histories
        .filter((h) => h.isActive)
        .map((h) => classMap.get(h.classId))
        .filter((n): n is string => !!n)
        .join(", ") || "-";

    const today = todayStr(0);
    const todayRec = all.find((a) => a.date === today);

    const inRange = all
      .filter((a) => a.date >= startDate && a.date <= endDate)
      .sort((a, b) => b.date.localeCompare(a.date));

    const summary = { hadir: 0, sakit: 0, izin: 0, alpa: 0, persentase: 0 };
    for (const a of inRange) {
      if (a.status === "Hadir") summary.hadir++;
      else if (a.status === "Sakit") summary.sakit++;
      else if (a.status === "Izin") summary.izin++;
      else summary.alpa++;
    }
    const counted = summary.hadir + summary.sakit + summary.izin + summary.alpa;
    if (counted > 0) summary.persentase = Math.round((summary.hadir / counted) * 1000) / 10;

    return {
      profile: { fullName: student.fullName, nis: student.nis, className },
      today: todayRec ? { status: todayRec.status, notes: todayRec.notes } : null,
      summary,
      records: inRange.slice(0, 500).map((a) => ({
        id: a._id,
        date: a.date,
        status: a.status,
        notes: a.notes,
        className: classMap.get(a.classId) ?? "-",
      })),
    };
  },
});