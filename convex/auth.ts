import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import {
  SESSION_TTL_MS,
  deleteUserSessions,
  fail,
  getSessionUser,
  hashPassword,
  publicUser,
  randomHex,
  requireUser,
  safeEqual,
  sha256Hex,
} from "./lib";
import { vPassword } from "./validators";

export const login = mutation({
  args: { username: v.string(), password: v.string() },
  handler: async (ctx, { username, password }) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("usernameLower", username.trim().toLowerCase()))
      .unique();

    // Tetap menghitung hash walau user tidak ada, agar waktu respons tidak membocorkan username
    const hash = await hashPassword(password, user?.passwordSalt ?? "0".repeat(32));
    if (!user || !user.isActive || !safeEqual(hash, user.passwordHash)) {
      fail("Username atau password salah.");
    }

    const token = randomHex(32);
    await ctx.db.insert("sessions", {
      userId: user._id,
      tokenHash: await sha256Hex(token),
      expiresAt: Date.now() + SESSION_TTL_MS,
    });
    return { token, user: publicUser(user) };
  },
});

export const logout = mutation({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const tokenHash = await sha256Hex(token);
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("tokenHash", tokenHash))
      .unique();
    if (session) await ctx.db.delete(session._id);
  },
});

// Mengembalikan null (bukan error) jika sesi tidak valid, supaya UI bisa kembali ke login
export const me = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const user = await getSessionUser(ctx, token);
    return user ? publicUser(user) : null;
  },
});

export const changePassword = mutation({
  args: { token: v.string(), oldPassword: v.string(), newPassword: v.string() },
  handler: async (ctx, { token, oldPassword, newPassword }) => {
    const user = await requireUser(ctx, token, ["admin", "guru", "siswa"]);
    if (!oldPassword) fail("Password lama wajib diisi.");
    const err = vPassword(newPassword, true);
    if (err) fail(err.replace("Password", "Password baru"));
    if (newPassword === oldPassword) fail("Password baru harus berbeda dari password lama.");

    const hash = await hashPassword(oldPassword, user.passwordSalt);
    if (!safeEqual(hash, user.passwordHash)) fail("Password lama tidak sesuai.");

    const salt = randomHex(16);
    await ctx.db.patch(user._id, {
      passwordSalt: salt,
      passwordHash: await hashPassword(newPassword, salt),
      mustChangePassword: false,
    });
    await deleteUserSessions(ctx, user._id); // semua perangkat harus login ulang
  },
});