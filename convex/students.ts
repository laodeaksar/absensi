import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import { assertValid, fail, genderValidator, requireUser, todayStr } from "./lib";
import { vNis, vNisn, vPersonName } from "./validators";

export const list = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    await requireUser(ctx, token, ["admin"]);
    const [students, histories, classes, siswaUsers] = await Promise.all([
      ctx.db.query("students").collect(),
      ctx.db.query("studentClassHistory").collect(),
      ctx.db.query("classes").collect(),
      ctx.db
        .query("users")
        .withIndex("by_role", (q) => q.eq("role", "siswa"))
        .collect(),
    ]);

    const className = new Map<string, string>();
    for (const c of classes) className.set(c._id, c.className);
    const currentClass = new Map<string, Id<"classes">>();
    for (const h of histories) if (h.isActive) currentClass.set(h.studentId, h.classId);
    const hasAccount = new Set<string>();
    for (const u of siswaUsers) if (u.studentId) hasAccount.add(u.studentId);

    return students
      .sort((a, b) => a.fullName.localeCompare(b.fullName))
      .map((s) => {
        const classId = currentClass.get(s._id) ?? null;
        return {
          _id: s._id,
          nis: s.nis,
          nisn: s.nisn,
          fullName: s.fullName,
          gender: s.gender,
          isActive: s.isActive,
          classId,
          className: classId ? (className.get(classId) ?? "-") : "-",
          hasAccount: hasAccount.has(s._id),
        };
      });
  },
});

export const save = mutation({
  args: {
    token: v.string(),
    id: v.optional(v.id("students")),
    nis: v.string(),
    nisn: v.string(),
    fullName: v.string(),
    gender: genderValidator,
    classId: v.id("classes"),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, a) => {
    await requireUser(ctx, a.token, ["admin"]);
    const nis = a.nis.trim();
    const nisn = a.nisn.trim();
    const fullName = a.fullName.trim();
    assertValid(vNis(nis), vNisn(nisn), vPersonName(fullName));

    const cls = await ctx.db.get(a.classId);
    if (!cls) fail("Kelas tidak ditemukan.");

    const id = a.id;
    const sameNisn = await ctx.db
      .query("students")
      .withIndex("by_nisn", (q) => q.eq("nisn", nisn))
      .collect();
    if (sameNisn.some((s) => s._id !== id)) fail("NISN sudah digunakan.");
    const sameNis = await ctx.db
      .query("students")
      .withIndex("by_nis", (q) => q.eq("nis", nis))
      .collect();
    if (sameNis.some((s) => s._id !== id)) fail("NIS sudah digunakan.");

    const today = todayStr();

    if (id) {
      if (!(await ctx.db.get(id))) fail("Data siswa tidak ditemukan.");
      await ctx.db.patch(id, {
        nis,
        nisn,
        fullName,
        gender: a.gender,
        ...(a.isActive !== undefined ? { isActive: a.isActive } : {}),
      });

      // Pindah kelas: tutup riwayat lama, buka riwayat baru
      const history = await ctx.db
        .query("studentClassHistory")
        .withIndex("by_student", (q) => q.eq("studentId", id))
        .collect();
      const active = history.find((h) => h.isActive);
      if (!active || active.classId !== a.classId) {
        if (active) await ctx.db.patch(active._id, { isActive: false, endDate: today });
        await ctx.db.insert("studentClassHistory", {
          studentId: id,
          classId: a.classId,
          academicYear: cls.academicYear,
          startDate: today,
          isActive: true,
        });
      }

      // Sinkronkan akun login siswa (username = NIS)
      const acct = await ctx.db
        .query("users")
        .withIndex("by_student", (q) => q.eq("studentId", id))
        .unique();
      if (acct) {
        const upd: { fullName: string; username?: string; usernameLower?: string; isActive?: boolean } = {
          fullName,
        };
        if (acct.usernameLower !== nis.toLowerCase()) {
          const taken = await ctx.db
            .query("users")
            .withIndex("by_username", (q) => q.eq("usernameLower", nis.toLowerCase()))
            .unique();
          if (taken && taken._id !== acct._id) fail("NIS dipakai sebagai username akun lain.");
          upd.username = nis;
          upd.usernameLower = nis.toLowerCase();
        }
        if (a.isActive !== undefined) upd.isActive = a.isActive;
        await ctx.db.patch(acct._id, upd);
      }
      return { id };
    }

    const studentId = await ctx.db.insert("students", {
      nis,
      nisn,
      fullName,
      gender: a.gender,
      isActive: true,
    });
    await ctx.db.insert("studentClassHistory", {
      studentId,
      classId: a.classId,
      academicYear: cls.academicYear,
      startDate: today,
      isActive: true,
    });
    return { id: studentId };
  },
});