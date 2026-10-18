import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { query } from "./_generated/server";
import { assertClassAccess, assertValid, fail, requireUser, todayStr } from "./lib";
import { vDate } from "./validators";

const REPORT_LIMIT = 10000;

export const dashboard = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const user = await requireUser(ctx, token, ["admin", "guru"]);
    const today = todayStr(0);
    const from = todayStr(-6); // 7 hari termasuk hari ini
    const scope = user.role === "guru" ? new Set<string>(user.assignedClasses) : null;

    // Total siswa aktif (guru: hanya di kelas yang diampu)
    let totalStudents = 0;
    if (scope) {
      const ids = new Set<string>();
      for (const classId of user.assignedClasses) {
        const hs = await ctx.db
          .query("studentClassHistory")
          .withIndex("by_class", (q) => q.eq("classId", classId).eq("isActive", true))
          .collect();
        for (const h of hs) ids.add(h.studentId);
      }
      totalStudents = ids.size;
    } else {
      totalStudents = (await ctx.db.query("students").collect()).filter((s) => s.isActive).length;
    }

    const recent = (
      await ctx.db
        .query("attendance")
        .withIndex("by_date", (q) => q.gte("date", from).lte("date", today))
        .collect()
    ).filter((a) => !scope || scope.has(a.classId));

    const stats = { totalStudents, hadir: 0, sakit: 0, izin: 0, alpa: 0, persentase: 0 };
    const perDate = new Map<string, { h: number; t: number }>();

    for (const a of recent) {
      if (a.date === today) {
        if (a.status === "Hadir") stats.hadir++;
        else if (a.status === "Sakit") stats.sakit++;
        else if (a.status === "Izin") stats.izin++;
        else stats.alpa++;
      }
      const d = perDate.get(a.date) ?? { h: 0, t: 0 };
      if (a.status === "Hadir") d.h++;
      else d.t++;
      perDate.set(a.date, d);
    }

    const counted = stats.hadir + stats.sakit + stats.izin + stats.alpa;
    if (counted > 0) stats.persentase = Math.round((stats.hadir / counted) * 1000) / 10;

    const dates = [...perDate.keys()].sort();
    return {
      stats,
      chart: {
        labels: dates,
        hadir: dates.map((d) => perDate.get(d)!.h),
        tidakHadir: dates.map((d) => perDate.get(d)!.t),
      },
    };
  },
});

export const report = query({
  args: {
    token: v.string(),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
    classId: v.optional(v.id("classes")),
  },
  handler: async (ctx, { token, startDate, endDate, classId }) => {
    const user = await requireUser(ctx, token, ["admin", "guru"]);
    const start = startDate || todayStr(-30);
    const end = endDate || todayStr(0);
    assertValid(vDate(start), vDate(end));
    if (start > end) fail("Tanggal awal tidak boleh melebihi tanggal akhir.");

    let rows: Doc<"attendance">[];
    if (classId) {
      assertClassAccess(user, classId);
      rows = await ctx.db
        .query("attendance")
        .withIndex("by_class_date", (q) => q.eq("classId", classId).gte("date", start).lte("date", end))
        .take(REPORT_LIMIT + 1);
    } else {
      rows = await ctx.db
        .query("attendance")
        .withIndex("by_date", (q) => q.gte("date", start).lte("date", end))
        .take(REPORT_LIMIT + 1);
      if (user.role === "guru") {
        const scope = new Set<string>(user.assignedClasses);
        rows = rows.filter((a) => scope.has(a.classId));
      }
    }

    const truncated = rows.length > REPORT_LIMIT;
    if (truncated) rows = rows.slice(0, REPORT_LIMIT);

    const [students, classes] = await Promise.all([
      ctx.db.query("students").collect(),
      ctx.db.query("classes").collect(),
    ]);
    const studentMap = new Map<string, Doc<"students">>();
    for (const s of students) studentMap.set(s._id, s);
    const classMap = new Map<string, string>();
    for (const c of classes) classMap.set(c._id, c.className);

    const data = rows
      .map((a) => {
        const s = studentMap.get(a.studentId);
        return {
          id: a._id,
          date: a.date,
          nis: s?.nis ?? "-",
          studentName: s?.fullName ?? "Siswa Tidak Ditemukan",
          className: classMap.get(a.classId) ?? "Kelas Tidak Ditemukan",
          status: a.status,
          notes: a.notes,
        };
      })
      .sort((a, b) => b.date.localeCompare(a.date) || a.studentName.localeCompare(b.studentName));

    return { rows: data, truncated };
  },
});