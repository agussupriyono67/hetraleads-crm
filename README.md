# Central CRM — Real-Time Leads Dashboard (Multi-Platform)
**PT Hetra Teknologi Indonesia &bull; ZWCAD & ZW3D Leads Hub**

Aplikasi CRM terpusat untuk memantau, mengelola, dan menindaklanjuti seluruh prospek (*leads*) dari berbagai website (`centralcad.id`, `cadsolution.co.id`, `orderonline`, form webinar) dan sinkronisasi real-time dua arah dengan Google Sheets menggunakan database **Supabase**.

---

## 📁 Struktur File dalam Folder `C:\Users\agus\central-crm\`

| File | Fungsi |
| :--- | :--- |
| **`supabase_schema.sql`** | Skrip database PostgreSQL lengkap: tabel `leads`, index performa, trigger anti-duplikat nomor WA, trigger `updated_at`, dan publikasi WebSocket real-time. |
| **`google_apps_script.js`** | Skrip otomatisasi Google Spreadsheet: mendeteksi baris baru/edit secara instan dan mengirimnya ke Supabase via REST API. |
| **`index.html`** | Antarmuka Dashboard CRM siap pakai (Tampilan Tabel, Kanban Pipeline, Tombol Quick WhatsApp, Deteksi Dobel, Metrik). |

---

## 🚀 Panduan Pemasangan & Menghubungkan (3 Langkah Cepat)

### Langkah 1: Siapkan Database Supabase (1 Menit)
1. Buka [database.new](https://database.new) atau login ke [supabase.com](https://supabase.com).
2. Buat Project Baru (misal: `central-crm-hetra`).
3. Di panel samping kiri, klik **SQL Editor** ➔ klik **New Query**.
4. Buka file `supabase_schema.sql`, salin (*copy*) seluruh isinya, lalu tempel (*paste*) di SQL Editor Supabase.
5. Klik tombol **Run** (Ctrl + Enter).
   * *Tabel `leads` dan fitur WebSocket real-time telah aktif!*
6. Masuk ke menu **Project Settings** (ikon gerigi) ➔ **API**:
   * Simpan **Project URL** (contoh: `https://xyzcompany.supabase.co`).
   * Simpan **Project API keys (anon / public)**.

---

### Langkah 2: Hubungkan Google Spreadsheet (Real-Time)
1. Buka Google Spreadsheet yang biasa digunakan tim sales untuk menampung leads.
2. Klik menu **Extensions (Ekstensi)** ➔ **Apps Script**.
3. Buka file `google_apps_script.js`, salin seluruh kodenya, dan ganti kode default di Apps Script.
4. Pada bagian `CONFIG` paling atas:
   * Masukkan `SUPABASE_URL` dan `SUPABASE_ANON_KEY` dari Langkah 1.
   * Pastikan urutan nomor kolom sesuai dengan tabel Google Sheet Anda.
5. Klik ikon **Save** (💾).
6. Buka menu **Triggers** (ikon jam di samping kiri) ➔ klik **Add Trigger**:
   * Function: `onFormSubmitTrigger` (jika dari Form) atau `onSheetEditTrigger` (jika ketik manual).
   * Event type: `On form submit` atau `On change`.
   * Klik **Save**.
7. *Hasil:* Setiap ada baris baru masuk di spreadsheet, data langsung meluncur ke database Supabase dalam hitungan detik!

---

### Langkah 3: Menjalankan Dashboard & Pasang di Domain Sendiri

1. **Uji Coba Langsung di Laptop:**
   * Buka file `index.html` langsung di browser Chrome/Edge.
   * Masukkan URL dan Anon Key Supabase di jendela pengaturan (ikon gerigi kanan atas).
   * Dashboard langsung terhubung live!
2. **Pasang di Domain Sendiri (Cloudflare Pages):**
   * Buat repository baru di GitHub (misal `central-crm`).
   * Push folder `C:\Users\agus\central-crm\` ke GitHub.
   * Di Cloudflare Dashboard ➔ **Workers & Pages** ➔ **Create application** ➔ **Pages** ➔ sambungkan repository tersebut (Framework preset: `None / Static HTML`, Build command kosong, Output directory kosong).
   * Tambahkan **Custom Domain** (misal: `crm.centralcad.id` atau domain khusus yang Mas Agus siapkan).
   * CRM siap diakses oleh Mas Agus dan tim sales di mana saja melalui laptop maupun ponsel!
