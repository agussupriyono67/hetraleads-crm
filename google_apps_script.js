/**
 * ==============================================================================
 * GOOGLE APPS SCRIPT: SINKRONISASI REAL-TIME SPREADSHEET KE SUPABASE CRM
 * PT Hetra Teknologi Indonesia / Central CAD & CadSolution
 * ==============================================================================
 * 
 * CARA MEMASANG:
 * 1. Buka Google Spreadsheet yang digunakan untuk menampung Leads.
 * 2. Klik menu: Extensions (Ekstensi) > Apps Script.
 * 3. Hapus kode lama, lalu Paste (Tempel) seluruh kode di bawah ini.
 * 4. Masukkan SUPABASE_URL dan SUPABASE_ANON_KEY milik Anda pada CONFIG di bawah.
 * 5. Sesuaikan nomor kolom sesuai susunan tabel Google Sheet Anda.
 * 6. Klik ikon Save (Disket) 💾.
 * 7. Buka menu Triggers (Ikon Jam di bilah kiri) > Klik 'Add Trigger' (Tambah Pemicu):
 *    - Choose which function to run: `onFormSubmitTrigger` (jika dari Form) atau `onSheetEditTrigger` (jika diketik manual).
 *    - Select event type: `On form submit` atau `On change`.
 * ==============================================================================
 */

// KONFIGURASI SUPABASE & SHEET
const CONFIG = {
  // Ganti dengan URL dan Anon Key project Supabase Anda
  SUPABASE_URL: "https://xyzcompany.supabase.co", 
  SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.contoh_token_anon_key_anda",
  
  // Nama Sheet / Tab yang ingin disinkronkan
  TARGET_SHEET_NAME: "Sheet1", // Ganti jika nama tab berbeda (misal: 'Leads 2026', 'Form Responses 1')
  
  // Posisi Kolom pada Spreadsheet (Kolom A = 1, B = 2, C = 3, dst.)
  COLUMNS: {
    TIMESTAMP: 1,      // Kolom A: Tanggal / Waktu Masuk
    NAMA_LENGKAP: 2,   // Kolom B: Nama Prospek
    PERUSAHAAN: 3,     // Kolom C: Nama Perusahaan / Instansi
    WHATSAPP: 4,       // Kolom D: Nomor WhatsApp
    EMAIL: 5,          // Kolom E: Alamat Email
    PRODUK_MINAT: 6,   // Kolom F: Produk yang diminati (ZWCAD / ZW3D)
    KOTA: 7,           // Kolom G: Domisili / Kota
    KEBUTUHAN: 8,      // Kolom H: Catatan Kebutuhan
    
    // Kolom Khusus Penanda Sinkronisasi (Bisa diletakkan di kolom terakhir, misal Kolom I = 9)
    SYNC_STATUS: 9     // Kolom I: Status Sync (otomatis diisi 'SYNCED' oleh skrip)
  },
  
  DEFAULT_SOURCE: "google_sheets_master" // Label sumber data
};

/**
 * 1. Pemicu Otomatis Saat Ada Submit Formulir (Google Form)
 */
function onFormSubmitTrigger(e) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    if (sheet.getName() !== CONFIG.TARGET_SHEET_NAME) return;
    
    // Dapatkan baris terakhir yang baru saja masuk
    const lastRow = sheet.getLastRow();
    syncRowToSupabase(sheet, lastRow);
  } catch (err) {
    Logger.log("Error onFormSubmit: " + err.message);
  }
}

/**
 * 2. Pemicu Otomatis Saat Ada Pengeditan / Penambahan Manual di Sheet
 */
function onSheetEditTrigger(e) {
  try {
    const range = e.range;
    const sheet = range.getSheet();
    if (sheet.getName() !== CONFIG.TARGET_SHEET_NAME) return;
    
    const row = range.getRow();
    // Jangan proses baris judul (header baris 1)
    if (row <= 1) return;
    
    // Cek apakah baris ini sudah disinkronkan sebelumnya
    const syncStatus = sheet.getRange(row, CONFIG.COLUMNS.SYNC_STATUS).getValue();
    if (syncStatus && syncStatus.toString().indexOf("SYNCED") !== -1) {
      return; // Sudah sinkron, lewati agar tidak dobel
    }
    
    syncRowToSupabase(sheet, row);
  } catch (err) {
    Logger.log("Error onSheetEdit: " + err.message);
  }
}

/**
 * Fungsi Utama: Mengirim 1 Baris Data ke REST API Supabase
 */
function syncRowToSupabase(sheet, rowIndex) {
  const rowValues = sheet.getRange(rowIndex, 1, 1, sheet.getLastColumn()).getValues()[0];
  
  const rawNama = rowValues[CONFIG.COLUMNS.NAMA_LENGKAP - 1];
  const rawWa = rowValues[CONFIG.COLUMNS.WHATSAPP - 1];
  
  // Validasi dasar: Jangan kirim baris kosong tanpa nama atau no WA
  if (!rawNama || !rawWa) return;
  
  // Bersihkan format nomor WA
  let cleanWa = rawWa.toString().replace(/[^0-9]/g, "");
  if (cleanWa.startsWith("08")) {
    cleanWa = "62" + cleanWa.substring(1);
  } else if (cleanWa.startsWith("8")) {
    cleanWa = "62" + cleanWa;
  }
  
  // Susun payload JSON sesuai tabel 'leads' Supabase
  const payload = {
    nama_lengkap: String(rawNama).trim(),
    nama_perusahaan: String(rowValues[CONFIG.COLUMNS.PERUSAHAAN - 1] || "-").trim(),
    no_whatsapp: cleanWa,
    email: String(rowValues[CONFIG.COLUMNS.EMAIL - 1] || "").trim(),
    produk_minat: String(rowValues[CONFIG.COLUMNS.PRODUK_MINAT - 1] || "ZWCAD 2026").trim(),
    kota_lokasi: String(rowValues[CONFIG.COLUMNS.KOTA - 1] || "").trim(),
    kebutuhan_detail: String(rowValues[CONFIG.COLUMNS.KEBUTUHAN - 1] || "").trim(),
    source_platform: CONFIG.DEFAULT_SOURCE,
    status: "NEW",
    external_id: "sheet_row_" + rowIndex
  };
  
  const options = {
    method: "post",
    contentType: "application/json",
    headers: {
      "apikey": CONFIG.SUPABASE_ANON_KEY,
      "Authorization": "Bearer " + CONFIG.SUPABASE_ANON_KEY,
      "Prefer": "return=representation"
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };
  
  const response = UrlFetchApp.fetch(CONFIG.SUPABASE_URL + "/rest/v1/leads", options);
  const responseCode = response.getResponseCode();
  
  if (responseCode === 201 || responseCode === 200) {
    // Berhasil kirim -> Tandai baris dengan cap tanggal
    const nowStr = Utilities.formatDate(new Date(), "Asia/Jakarta", "yyyy-MM-dd HH:mm:ss");
    sheet.getRange(rowIndex, CONFIG.COLUMNS.SYNC_STATUS).setValue("SYNCED (" + nowStr + ")");
    Logger.log("Row " + rowIndex + " successfully synced to Supabase!");
  } else {
    sheet.getRange(rowIndex, CONFIG.COLUMNS.SYNC_STATUS).setValue("FAILED (" + responseCode + ")");
    Logger.log("Failed row " + rowIndex + ": " + response.getContentText());
  }
}

/**
 * 3. Menu Kustom di Atas Spreadsheet untuk Sync Massal Sekaligus
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu("🚀 CRM Supabase")
    .addItem("Sinkronkan Baris Belum Terkirim", "syncAllUnsyncedRows")
    .addToUi();
}

/**
 * Eksekusi Sinkronisasi Seluruh Baris yang Belum Masuk ke Supabase
 */
function syncAllUnsyncedRows() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.TARGET_SHEET_NAME);
  if (!sheet) {
    SpreadsheetApp.getUi().alert("Sheet '" + CONFIG.TARGET_SHEET_NAME + "' tidak ditemukan!");
    return;
  }
  
  const lastRow = sheet.getLastRow();
  let count = 0;
  
  for (let r = 2; r <= lastRow; r++) {
    const status = sheet.getRange(r, CONFIG.COLUMNS.SYNC_STATUS).getValue();
    if (!status || status.toString().indexOf("SYNCED") === -1) {
      syncRowToSupabase(sheet, r);
      count++;
      Utilities.sleep(200); // jeda halus agar aman dari rate limit
    }
  }
  
  SpreadsheetApp.getUi().alert("Selesai! " + count + " baris data telah diproses ke Supabase CRM.");
}
