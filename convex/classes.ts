import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { assertValid, fail, requireUser } from "./lib";
import { vAcademicYear, vRequired } from "./validators";

// Master data kelas (admin)
export const list = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    await requireUser(ctx, token, ["admin"]);
    const [classes, teachers] = await Promise.all([
      ctx.db.query("classes").collect(),
      ctx.db
        .query("users")
        .withIndex("by_role", (q) => q.eq("role", "guru"))
        .collect(),
    ]);
    const names = new Map<string, string>();
    for (const t of teachers) names.set(t._id, t.fullName);

    return classes
      .sort((a, b) => b.academicYear.localeCompare(a.academicYear) || a.className.localeCompare(b.className))
      .map((c) => ({
        _id: c._id,
        className: c.className,
        gradeLevel: c.gradeLevel,
        academicYear: c.academicYear,
        homeroomTeacher: c.homeroomTeacher ?? null,
        homeroomName: c.homeroomTeacher ? (names.get(c.homeroomTeacher) ?? "-") : "-",
        isActive: c.isActive,
      }));
  },
});

// Kelas yang boleh dipilih untuk absensi/laporan: admin semua kelas aktif, guru hanya kelas yang diampu
export const listMine = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const user = await requireUser(ctx, token, ["admin", "guru"]);
    const classes = (await ctx.db.query("classes").collect()).filter(
      (c) => c.isActive && (user.role === "admin" || user.assignedClasses.includes(c._id)),
    );
    return classes
      .sort((a, b) => a.className.localeCompare(b.className))
      .map((c) => ({ _id: c._id, className: c.className, academicYear: c.academicYear }));
  },
});

export const save = mutation({
  args: {
    token: v.string(),
    id: v.optional(v.id("classes")),
    className: v.string(),
    gradeLevel: v.string(),
    academicYear: v.string(),
    homeroomTeacher: v.optional(v.id("users")),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, a) => {
    await requireUser(ctx, a.token, ["admin"]);
    const className = a.className.trim();
    const gradeLevel = a.gradeLevel.trim();
    const academicYear = a.academicYear.trim();
    assertValid(
      vRequired(className, "Nama kelas", 50),
      vRequired(gradeLevel, "Tingkat", 20),
      vAcademicYear(academicYear),
    );

    const same = await ctx.db
      .query("classes")
      .withIndex("by_name_year", (q) => q.eq("className", className).eq("academicYear", academicYear))
      .collect();
    if (same.some((c) => c._id !== a.id)) fail("Nama kelas sudah ada pada tahun ajaran tersebut.");

    if (a.homeroomTeacher) {
      const wali = await ctx.db.get(a.homeroomTeacher);
      if (!wali || wali.role !== "guru" || !wali.isActive) fail("Wali kelas tidak valid.");
    }

    if (a.id) {
      if (!(await ctx.db.get(a.id))) fail("Data kelas tidak ditemukan.");
      await ctx.db.patch(a.id, {
        className,
        gradeLevel,
        academicYear,
        homeroomTeacher: a.homeroomTeacher, // undefined = hapus wali kelas
        ...(a.isActive !== undefined ? { isActive: a.isActive } : {}),
      });
      return { id: a.id };
    }
    const id = await ctx.db.insert("classes", {
      className,
      gradeLevel,
      academicYear,
      homeroomTeacher: a.homeroomTeacher,
      isActive: true,
    });
    return { id };
  },
});