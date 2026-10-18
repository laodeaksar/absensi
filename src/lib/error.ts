import { ConvexError } from "convex/values";

export function isAuthError(e: unknown): boolean {
  return e instanceof ConvexError && e.data === "AUTH_FAILED";
}

export function errMsg(e: unknown): string {
  if (e instanceof ConvexError) {
    if (e.data === "AUTH_FAILED") return "Sesi berakhir, silakan login kembali.";
    if (e.data === "FORBIDDEN") return "Anda tidak memiliki akses.";
    return typeof e.data === "string" ? e.data : "Terjadi kesalahan.";
  }
  if (e instanceof Error) return e.message;
  return "Terjadi kesalahan.";
}