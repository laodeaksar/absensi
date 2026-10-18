import { internalMutation } from "./_generated/server";
import { hashPassword, randomHex, todayStr } from "./lib";

// Jalankan sekali: npx convex run seed:init
export const init = internalMutation({
  args: {},
  handler: async (ctx) => {
    if (await ctx.db.query("users").first()) {
      return "Database sudah berisi data, seed dilewati.";
    }

    const today = todayStr();

    const classId = await ctx.db.insert("classes", {
      className: "X MIPA 1",
      gradeLevel: "X",
      academicYear: "2025/2026",
      isActive: true,
    });

    const adminSalt = randomHex(16);
    await ctx.db.insert("users", {
      username: "admin",
      usernameLower: "admin",
      passwordSalt: adminSalt,
      passwordHash: await hashPassword("admin123", adminSalt),
      fullName: "Administrator Utama",
      role: "admin",
      assignedClasses: [],
      isActive: true,
      mustChangePassword: true,
    });

    const guruSalt = randomHex(16);
    const guruId = await ctx.db.insert("users", {
      username: "guru01",
      usernameLower: "guru01",
      passwordSalt: guruSalt,
      passwordHash: await hashPassword("guru123", guruSalt),
      fullName: "Budi Santoso, S.Pd",
      role: "guru",
      assignedClasses: [classId],
      isActive: true,
      mustChangePassword: true,
    });
    await ctx.db.patch(classId, { homeroomTeacher: guruId });

    const demo = [
      { nis: "1001", nisn: "0011223344", fullName: "Andi Wijaya", gender: "L" as const },
      { nis: "1002", nisn: "0011223355", fullName: "Siti Aminah", gender: "P" as const },
    ];
    for (const s of demo) {
      const studentId = await ctx.db.insert("students", { ...s, isActive: true });
      await ctx.db.insert("studentClassHistory", {
        studentId,
        classId,
        academicYear: "2025/2026",
        startDate: today,
        isActive: true,
      });
    }

    return "Seed selesai. Login: admin / admin123 atau guru01 / guru123 (wajib ganti password).";
  },
});