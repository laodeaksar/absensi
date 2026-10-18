import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { assertValid, getSettings, requireUser } from "./lib";
import { vAcademicYear, vEditWindow, vMax, vNip, vRequired } from "./validators";

// Tanpa login: hanya data yang aman untuk halaman login
export const getPublic = query({
  args: {},
  handler: async (ctx) => {
    const s = await getSettings(ctx);
    return { schoolName: s.schoolName };
  },
});

// Semua pengguna yang sudah login (dipakai untuk kop & tanda tangan cetak)
export const get = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    await requireUser(ctx, token, ["admin", "guru", "siswa"]);
    return await getSettings(ctx);
  },
});

export const save = mutation({
  args: {
    token: v.string(),
    schoolName: v.optional(v.string()),
    schoolAddress: v.optional(v.string()),
    principalName: v.optional(v.string()),
    principalNip: v.optional(v.string()),
    activeAcademicYear: v.optional(v.string()),
    editWindowDays: v.optional(v.string()),
  },
  handler: async (ctx, { token, ...input }) => {
    await requireUser(ctx, token, ["admin"]);

    const clean: Record<string, string> = {};
    for (const [key, raw] of Object.entries(input)) {
      if (raw !== undefined) clean[key] = raw.trim();
    }

    assertValid(
      clean.schoolName !== undefined ? vRequired(clean.schoolName, "Nama sekolah", 100) : "",
      clean.schoolAddress !== undefined ? vMax(clean.schoolAddress, "Alamat sekolah", 200) : "",
      clean.principalName !== undefined ? vMax(clean.principalName, "Nama kepala sekolah", 100) : "",
      clean.principalNip !== undefined ? vNip(clean.principalNip) : "",
      clean.activeAcademicYear !== undefined ? vAcademicYear(clean.activeAcademicYear, false) : "",
      clean.editWindowDays !== undefined ? vEditWindow(clean.editWindowDays) : "",
    );
    if (clean.editWindowDays !== undefined) {
      clean.editWindowDays = String(Number(clean.editWindowDays || "0"));
    }

    for (const [key, value] of Object.entries(clean)) {
      const row = await ctx.db
        .query("settings")
        .withIndex("by_key", (q) => q.eq("key", key))
        .unique();
      if (row) await ctx.db.patch(row._id, { value });
      else await ctx.db.insert("settings", { key, value });
    }
  },
});