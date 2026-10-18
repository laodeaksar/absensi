import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import {
  assertClassAccess,
  assertValid,
  fail,
  getSettings,
  requireUser,
  statusValidator,
  todayStr,
} from "./lib";
import { vDate, vMax } from "./validators";

type Status = "Hadir" | "Sakit" | "Izin" | "Alpa";

export const getForm = query({
  args: { token: v.string(), date: v.string(), classId: v.id("classes") },
  handler: async (ctx, { token, date, classId }) => {
    const user = await requireUser(ctx, token, ["admin", "guru"]);
    assertClassAccess(user, classId);
    assertValid(vDate(date));

    const [histories, records] = await Promise.all([
      ctx.db
        .query("studentClassHistory")
        .withIndex("by_class", (q) => q.eq("classId", classId).eq("isActive", true))
        .collect(),
      ctx.db
        .query("attendance")
        .withIndex("by_class_date", (q) => q.eq("classId", classId).eq("date", date))
        .collect(),
    ]);

    const byStudent = new Map<string, Doc<"attendance">>();
    for (const r of records) byStudent.set(r.studentId, r);

    const rows = [];
    for (const h of histories) {
      const s = await ctx.db.get(h.studentId);
      if (!s || !s.isActive) continue;
      const att = byStudent.get(s._id);
      rows.push({
        studentId: s._id,
        nis: s.nis,
        fullName: s.fullName,
        status: (att?.status ?? "") as Status | "",
        notes: att?.notes ?? "",
      });
    }
    return rows.sort((a, b) => a.fullName.localeCompare(b.fullName));
  },
});

export const submitBatch = mutation({
  args: {
    token: v.string(),
    date: v.string(),
    classId: v.id("classes"),
    entries: v.array(
      v.object({
        studentId: v.id("students"),
        status: statusValidator,
        notes: v.string(),
      }),
    ),
  },
  handler: async (ctx, { token, date, classId, entries }) => {
    const user = await requireUser(ctx, token, ["admin", "guru"]);
    assertClassAccess(user, classId);
    assertValid(vDate(date));

    // Guru dibatasi sesuai pengaturan "batas edit absensi"
    if (user.role === "guru") {
      const { editWindowDays } = await getSettings(ctx);
      if (editWindowDays > 0 && date < todayStr(-editWindowDays)) {
        fail(
          `Absensi tanggal ${date} sudah dikunci. Guru hanya dapat mengisi atau mengubah absensi maksimal ${editWindowDays} hari ke belakang.`,
        );
      }
    }

    // Hanya siswa yang memang aktif di kelas ini yang boleh disimpan
    const histories = await ctx.db
      .query("studentClassHistory")
      .withIndex("by_class", (q) => q.eq("classId", classId).eq("isActive", true))
      .collect();
    const allowed = new Set<string>(histories.map((h) => h.studentId));

    const existing = await ctx.db
      .query("attendance")
      .withIndex("by_class_date", (q) => q.eq("classId", classId).eq("date", date))
      .collect();
    const byStudent = new Map<string, Doc<"attendance">>();
    for (const r of existing) byStudent.set(r.studentId, r);

    let saved = 0;
    for (const e of entries) {
      if (!allowed.has(e.studentId)) continue;
      const notes = e.notes.trim();
      assertValid(vMax(notes, "Keterangan", 200));
      const prev = byStudent.get(e.studentId);
      if (prev) {
        await ctx.db.patch(prev._id, { status: e.status, notes, recordedBy: user._id });
      } else {
        await ctx.db.insert("attendance", {
          date,
          studentId: e.studentId,
          classId,
          status: e.status,
          notes,
          recordedBy: user._id,
        });
      }
      saved++;
    }
    return { saved };
  },
});