import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import { assertValid, deleteUserSessions, fail, hashPassword, randomHex, requireUser } from "./lib";
import { vEmail, vNip, vPassword, vPhone, vRequired, vUsername } from "./validators";

export const list = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    await requireUser(ctx, token, ["admin"]);
    const [teachers, classes] = await Promise.all([
      ctx.db
        .query("users")
        .withIndex("by_role", (q) => q.eq("role", "guru"))
        .collect(),
      ctx.db.query("classes").collect(),
    ]);
    const className = new Map<string, string>();
    for (const c of classes) className.set(c._id, c.className);

    return teachers
      .sort((a, b) => a.fullName.localeCompare(b.fullName))
      .map((t) => ({
        _id: t._id,
        fullName: t.fullName,
        username: t.username,
        nip: t.nip ?? "",
        phone: t.phone ?? "",
        email: t.email ?? "",
        isActive: t.isActive,
        assignedClassIds: t.assignedClasses,
        assignedClassNames: t.assignedClasses
          .map((id) => className.get(id))
          .filter((n): n is string => !!n),
      }));
  },
});

// Buat guru baru (tanpa id) atau ubah (dengan id). Field yang tidak dikirim dipertahankan.
export const save = mutation({
  args: {
    token: v.string(),
    id: v.optional(v.id("users")),
    fullName: v.optional(v.string()),
    username: v.optional(v.string()),
    nip: v.optional(v.string()),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    password: v.optional(v.string()),
    assignedClasses: v.optional(v.array(v.id("classes"))),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, a) => {
    await requireUser(ctx, a.token, ["admin"]);

    const existing = a.id ? await ctx.db.get(a.id) : null;
    if (a.id && (!existing || existing.role !== "guru")) fail("Data guru tidak ditemukan.");

    const fullName = (a.fullName ?? existing?.fullName ?? "").trim();
    const username = (a.username ?? existing?.username ?? "").trim();
    const nip = (a.nip ?? existing?.nip ?? "").trim();
    const phone = (a.phone ?? existing?.phone ?? "").trim();
    const email = (a.email ?? existing?.email ?? "").trim();
    const password = a.password ?? "";

    assertValid(
      vRequired(fullName, "Nama lengkap", 100),
      vUsername(username),
      vNip(nip),
      vPhone(phone),
      vEmail(email),
      vPassword(password, !existing),
    );

    const sameUsername = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("usernameLower", username.toLowerCase()))
      .collect();
    if (sameUsername.some((u) => u._id !== a.id)) fail("Username sudah digunakan.");

    if (nip) {
      const teachers = await ctx.db
        .query("users")
        .withIndex("by_role", (q) => q.eq("role", "guru"))
        .collect();
      if (teachers.some((t) => t.nip === nip && t._id !== a.id)) fail("NIP sudah digunakan.");
    }

    let assigned: Id<"classes">[] = existing?.assignedClasses ?? [];
    if (a.assignedClasses !== undefined) {
      assigned = [];
      for (const classId of a.assignedClasses) {
        if (await ctx.db.get(classId)) assigned.push(classId);
      }
    }

    const credentials: { passwordSalt?: string; passwordHash?: string } = {};
    if (password) {
      const salt = randomHex(16);
      credentials.passwordSalt = salt;
      credentials.passwordHash = await hashPassword(password, salt);
    }

    if (existing) {
      await ctx.db.patch(existing._id, {
        fullName,
        username,
        usernameLower: username.toLowerCase(),
        nip,
        phone,
        email,
        assignedClasses: assigned,
        ...(a.isActive !== undefined ? { isActive: a.isActive } : {}),
        ...credentials,
        ...(password ? { mustChangePassword: false } : {}),
      });
      // Paksa login ulang agar perubahan kelas/status/password berlaku
      await deleteUserSessions(ctx, existing._id);
      return { id: existing._id };
    }

    const id = await ctx.db.insert("users", {
      username,
      usernameLower: username.toLowerCase(),
      passwordSalt: credentials.passwordSalt ?? "",
      passwordHash: credentials.passwordHash ?? "",
      fullName,
      role: "guru",
      assignedClasses: assigned,
      isActive: a.isActive ?? true,
      nip,
      phone,
      email,
      mustChangePassword: false,
    });
    return { id };
  },
});