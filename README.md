# EduAbsen (Convex + Next.js)

Sistem absensi siswa dengan tiga peran: **Administrator**, **Guru**, **Siswa**.

- Backend: [Convex](https://convex.dev) (database, fungsi server, reaktif/realtime)
- Frontend: Next.js (App Router) + TypeScript + Tailwind v4 + daisyUI 5
- Autentikasi: username + password (PBKDF2-SHA256, salt per akun), sesi token 6 jam

## Menjalankan di lokal

```bash
npm install

# Terminal 1: buat/hubungkan proyek Convex, tulis .env.local, sinkronkan fungsi
npx convex dev

# Terminal 2 (sekali saja): isi data awal
npx convex run seed:init

# Terminal 3: jalankan Next.js
npm run dev
```

Buka http://localhost:3000

Akun awal dari seed (wajib ganti password saat login pertama):

| Peran | Username | Password |
|-------|----------|----------|
| Admin | `admin`  | `admin123` |
| Guru  | `guru01` | `guru123` |

## Akun siswa

Di **Data Siswa** klik **Buat Akun Siswa**. Username = NIS, password awal = NISN.
Siswa diminta mengganti password saat login pertama. Tombol **Reset Akun** di tiap baris
membuat akun atau mengembalikan password ke NISN.

## Struktur

```
convex/
  schema.ts         tabel & index
  lib.ts            sesi, otorisasi, hashing, pengaturan, zona waktu
  validators.ts     aturan validasi (dipakai server DAN form)
  auth.ts           login, logout, me, changePassword
  settings.ts       pengaturan sekolah & batas edit absensi
  classes.ts  students.ts  teachers.ts
  attendance.ts     form absensi & simpan massal
  reports.ts        dashboard & laporan
  studentPortal.ts  akun siswa & halaman kehadiran siswa
  seed.ts           data awal
src/
  app/              halaman (login, dashboard, attendance, reports, students,
                    classes, teachers, settings, my-attendance)
  components/       AuthProvider, Shell, ui, Charts, Toast, ErrorBoundary
  lib/              useForm, errors, dates, useRoleGuard
```

## Keamanan

- Setiap fungsi Convex memanggil `requireUser(ctx, token, [peran])`. Peran wajib disebut
  eksplisit, jadi siswa tidak bisa memanggil fungsi admin/guru walau token-nya valid.
- Guru hanya bisa mengakses kelas yang diampu (absensi, laporan, dashboard).
- Siswa hanya bisa membaca datanya sendiri; `studentId` diambil dari sesi, bukan dari parameter.
- Hanya hash token sesi yang disimpan di database. Ganti/reset password menghapus semua sesi akun itu.
- Pesan error untuk pengguna memakai `ConvexError` agar terbaca di production.

## Catatan

- Zona waktu tanggal absensi: WIB. Ubah `TZ_OFFSET_HOURS` di `convex/lib.ts` untuk WITA (8) / WIT (9).
- Token sesi disimpan di `localStorage` (sama seperti versi Apps Script). Untuk keamanan lebih
  tinggi, pindahkan ke cookie httpOnly lewat Route Handler Next.js.
- Belum ada pembatasan percobaan login (rate limit). Pertimbangkan menambahkannya sebelum produksi.
- Data lama dari Google Sheets belum diimpor. Format tabelnya berbeda (id Convex vs ID teks).

## Deploy

1. `npx convex deploy` (membuat deployment production, catat URL-nya)
2. Deploy Next.js (mis. Vercel) dengan environment variable `NEXT_PUBLIC_CONVEX_URL` = URL production Convex
3. Jalankan seed di production: `npx convex run seed:init --prod`# absensi
# absensi
