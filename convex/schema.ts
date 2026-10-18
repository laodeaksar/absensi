import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { genderValidator, roleValidator, statusValidator } from "./lib";

export default defineSchema({
  users: defineTable({
    username: v.string(),
    usernameLower: v.string(), // untuk pengecekan unik tanpa peduli huruf besar/kecil
    passwordHash: v.string(),
    passwordSalt: v.string(),
    fullName: v.string(),
    role: roleValidator,
    assignedClasses: v.array(v.id("classes")), // kelas yang diampu (guru)
    isActive: v.boolean(),
    nip: v.optional(v.string()),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    studentId: v.optional(v.id("students")), // terisi untuk akun siswa
    mustChangePassword: v.boolean(),
  })
    .index("by_username", ["usernameLower"])
    .index("by_student", ["studentId"])
    .index("by_role", ["role"]),

  sessions: defineTable({
    userId: v.id("users"),
    tokenHash: v.string(), // hanya hash token yang disimpan
    expiresAt: v.number(),
  })
    .index("by_token", ["tokenHash"])
    .index("by_user", ["userId"]),

  classes: defineTable({
    className: v.string(),
    gradeLevel: v.string(),
    academicYear: v.string(),
    homeroomTeacher: v.optional(v.id("users")),
    isActive: v.boolean(),
  }).index("by_name_year", ["className", "academicYear"]),

  students: defineTable({
    nis: v.string(),
    nisn: v.string(),
    fullName: v.string(),
    gender: genderValidator,
    isActive: v.boolean(),
  })
    .index("by_nis", ["nis"])
    .index("by_nisn", ["nisn"]),

  studentClassHistory: defineTable({
    studentId: v.id("students"),
    classId: v.id("classes"),
    academicYear: v.string(),
    startDate: v.string(),
    endDate: v.optional(v.string()),
    isActive: v.boolean(),
  })
    .index("by_class", ["classId", "isActive"])
    .index("by_student", ["studentId"]),

  attendance: defineTable({
    date: v.string(), // yyyy-MM-dd
    studentId: v.id("students"),
    classId: v.id("classes"),
    status: statusValidator,
    notes: v.string(),
    recordedBy: v.id("users"),
  })
    .index("by_class_date", ["classId", "date"])
    .index("by_student_date", ["studentId", "date"])
    .index("by_date", ["date"]),

  settings: defineTable({
    key: v.string(),
    value: v.string(),
  }).index("by_key", ["key"]),
});