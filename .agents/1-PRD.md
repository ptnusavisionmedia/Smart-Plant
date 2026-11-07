# PRD — Smart Plant Emergency Detector

**Versi:** 1.0 (V1)
**Platform:** Aplikasi Mobile (Android & iOS) + Website Dashboard
**Perangkat:** ESP32 + sensor lingkungan + pompa air
**Status:** Draft untuk direview

---

## 1. Visi & Tujuan Produk

### Visi Produk

Smart Plant Emergency Detector adalah sistem monitoring dan penyiraman tanaman berbasis IoT yang membantu pemilik tanaman memahami kondisi nyata tanaman—bukan sekadar menebak kapan harus menyiram. Dengan menggabungkan beberapa sensor lingkungan, pengambilan keputusan otomatis, dan peringatan dini, sistem menjaga tanaman tetap sehat sekaligus mencegah kerusakan akibat penyiraman berlebihan. Mobile app menjadi kanal utama untuk peringatan dan kontrol cepat, sedangkan website dashboard menjadi pusat analisis, histori, dan pengelolaan banyak perangkat.

### Tujuan Utama

1. **Memantau kondisi tanaman secara real-time** — data sensor tampil di dashboard dalam ≤ 30 detik setelah pengukuran.
2. **Mendeteksi kondisi tidak ideal lebih awal** — status NORMAL/WARNING/CRITICAL/WATER LOW dihitung otomatis dari beberapa sensor, bukan satu sensor saja.
3. **Mengotomatisasi penyiraman dengan aman** — pompa menyala hanya saat tanah kering, tangki berisi air, dan tidak ada override manual/emergency stop.
4. **Memberikan peringatan yang sampai ke pengguna** — notifikasi in-app, push, dan Telegram terkirim ≤ 30 detik setelah kondisi berubah.
5. **Menyimpan riwayat untuk analisis** — tren kelembapan tanah, suhu, kelembapan udara, dan aktivitas penyiraman dapat dilihat kembali.

### Value Proposition

- **Multi-sensor, bukan single-sensor** — keputusan mempertimbangkan kelembapan tanah, suhu, kelembapan udara, dan ketersediaan air sekaligus.
- **Aman dari penyiraman berlebihan** — ada target kelembapan, durasi maksimal pompa, cooldown, dan emergency stop fisik.
- **Tetap berjalan saat internet putus** — perangkat ESP32 menjalankan logika penyiraman lokal; cloud hanya untuk monitoring dan kontrol jarak jauh.
- **Satu akun, banyak perangkat** — cocok untuk rumah tangga, sekolah, hingga pengelola greenhouse dengan beberapa area.
- **Peringatan berlapis** — in-app, push notification, dan Telegram agar tidak terlewat.

### Metrik Keberhasilan V1

| Metrik | Target |
|---|---|
| Latensi data sensor ke dashboard | ≤ 30 detik |
| Latensi perintah penyiraman manual | ≤ 15 detik |
| Akurasi status kondisi vs pembacaan sensor | 100% sesuai aturan threshold |
| Notifikasi darurat terkirim | ≤ 30 detik, ≥ 99% terkirim |
| Ketersediaan layanan cloud | ≥ 99% per bulan |
| False alarm akibat noise sensor | < 5% (debounce 3 sampel) |

---

## 2. User Persona

### Persona 1: Rina — Penggemar Tanaman & Rumah Tangga

- **Usia/Pekerjaan:** 28 tahun, karyawan kantor yang merawat 8 tanaman hias di rumah.
- **Level Teknis:** Pemula.
- **Tujuan:** Mengetahui kapan tanaman butuh air tanpa harus mengecek satu per satu, dan mendapat peringatan saat sedang di kantor.
- **Pain Points:** Sering lupa menyiram; pernah menyiram berlebihan sampai akar busuk; tidak paham arti angka kelembapan tanah.
- **Motivasi:** Ingin perawatan tanaman yang sederhana, otomatis, dan memberi ketenangan.
- **Kebutuhan utama:** Mobile app dengan status sederhana, notifikasi, dan tombol siram manual.

### Persona 2: Pak Budi — Pengelola Greenhouse / Petani Kecil

- **Usia/Pekerjaan:** 45 tahun, mengelola greenhouse dengan 3 area tanaman.
- **Level Teknis:** Menengah.
- **Tujuan:** Mengawasi beberapa area dari satu dashboard, melihat tren historis, dan memastikan penyiraman berjalan konsisten.
- **Pain Points:** Harus berkeliling mengecek area; sulit membuktikan apakah penyiraman berjalan; tidak ada catatan riwayat.
- **Motivasi:** Mengurangi kerja manual dan mendeteksi masalah lebih cepat.
- **Kebutuhan utama:** Website dashboard multi-perangkat, histori, ekspor data, pengaturan threshold per area.

### Segmen Lain yang Dilayani

- **Sekolah** — media pembelajaran IoT; akun guru mengelola perangkat, siswa hanya melihat.
- **Pengguna single-device** — cukup satu perangkat, tetap memakai alur yang sama.

---

## 3. User Stories

### Modul Autentikasi & Akun
1. Sebagai pengguna baru, saya ingin mendaftar dengan email dan password, agar dapat mulai memakai sistem.
2. Sebagai pengguna, saya ingin login dan tetap masuk antar sesi, agar tidak berulang kali memasukkan kredensial.
3. Sebagai pengguna, saya ingin mereset password melalui email, agar tetap bisa mengakses akun saat lupa password.

### Modul Perangkat
4. Sebagai pengguna, saya ingin menambahkan perangkat dengan kode pairing, agar perangkat ESP32 terhubung ke akun saya.
5. Sebagai pengguna dengan banyak area, saya ingin memberi nama dan mengelompokkan perangkat, agar mudah membedakan lokasi tanaman.

### Modul Monitoring
6. Sebagai pengguna, saya ingin melihat kelembapan tanah, suhu, kelembapan udara, dan level air secara real-time, agar mengetahui kondisi tanaman saat ini.
7. Sebagai pengguna, saya ingin melihat status kondisi (NORMAL/WARNING/CRITICAL/WATER LOW) beserta alasannya, agar langsung tahu tindakan yang perlu dilakukan.
8. Sebagai pengguna, saya ingin melihat status perangkat online/offline dan waktu pembacaan terakhir, agar tahu apakah data masih dapat dipercaya.
9. Sebagai pengguna, saya ingin melihat grafik tren historis, agar dapat menganalisis pola kondisi tanaman.

### Modul Penyiraman
10. Sebagai pengguna, saya ingin mengaktifkan/mematikan penyiraman otomatis per perangkat, agar sesuai dengan kebutuhan tanaman.
11. Sebagai pengguna, saya ingin menyiram secara manual dengan durasi tertentu, agar bisa mengambil tindakan cepat.
12. Sebagai pengguna, saya ingin menghentikan pompa segera (emergency stop), agar tidak terjadi penyiraman berlebihan atau kerusakan.

### Modul Peringatan
13. Sebagai pengguna, saya ingin menerima notifikasi saat status berubah menjadi WARNING/CRITICAL/WATER LOW, agar bisa bertindak sebelum tanaman rusak.
14. Sebagai pengguna, saya ingin memilih kanal peringatan (in-app, push, Telegram), agar peringatan sampai lewat kanal yang saya pantau.

### Modul Riwayat & Pengaturan
15. Sebagai pengguna, saya ingin mengatur threshold dan jadwal penyiraman per perangkat, agar keputusan sistem sesuai jenis tanaman dan lingkungan saya.

---

## 4. Functional Requirements

### Konsep Status Kondisi Tanaman (Business Rule Inti)

Sistem mengevaluasi seluruh sensor, lalu menetapkan **satu status headline** dengan prioritas berikut:

1. **CRITICAL** — jika ada sensor yang masuk kategori critical (tanah sangat kering/sangat basah, suhu ekstrem, kelembapan udara ekstrem).
2. **WATER LOW** — jika level air tangki di bawah batas minimum dan tidak ada kondisi critical.
3. **WARNING** — jika ada sensor di luar rentang ideal namun belum critical.
4. **NORMAL** — jika semua sensor dalam rentang ideal.

**Aturan tambahan:**
- Status **WATER LOW selalu memblokir pompa**, walaupun status headline saat itu CRITICAL. Jika keduanya aktif, CRITICAL tampil sebagai headline dan WATER LOW tampil sebagai badge.
- Setiap perubahan status harus menyertakan **alasan** (sensor mana yang memicu).
- Status dihitung dari **3 pembacaan berturut-turut** (debounce) untuk mencegah false alarm akibat noise sensor.

**Threshold default (dapat diubah per perangkat):**

| Sensor | Critical | Warning | Normal | Warning | Critical |
|---|---|---|---|---|---|
| Kelembapan tanah | < 25% | 25–39% | 40–70% | 71–85% | > 85% |
| Suhu lingkungan | < 15°C | 15–17°C | 18–30°C | 31–35°C | > 35°C |
| Kelembapan udara | < 40% | 40–49% | 50–70% | 71–80% | > 80% |
| Level air tangki | — | 15–30% | > 30% | — | < 15% (= WATER LOW) |

### Modul Autentikasi

**FR-01: Registrasi Pengguna**
- **Input:** Nama, email, password.
- **Proses:** Validasi format email dan keunikan, hash password, buat akun, kirim email verifikasi.
- **Output:** Akun aktif setelah verifikasi; sesi login otomatis.
- **Aturan:** Password minimal 8 karakter; email harus valid dan belum terdaftar.

**FR-02: Login Pengguna**
- **Input:** Email, password.
- **Proses:** Verifikasi kredensial, terbitkan token akses dan refresh token.
- **Output:** Token akses; masuk ke dashboard/home.
- **Aturan:** 5 kali gagal berturut-turut → akun dikunci sementara 15 menit.

**FR-03: Reset Password**
- **Input:** Email.
- **Proses:** Kirim tautan reset berbatas waktu; simpan password baru yang sudah di-hash.
- **Output:** Konfirmasi email terkirim; password berhasil diubah.
- **Aturan:** Tautan reset berlaku 30 menit dan hanya dapat dipakai sekali.

### Modul Perangkat

**FR-04: Registrasi/Pairing Perangkat**
- **Input:** Kode pairing perangkat atau Device ID + secret.
- **Proses:** Validasi kode, ikat perangkat ke akun, simpan kredensial perangkat.
- **Output:** Perangkat muncul di daftar dan mulai mengirim telemetry.
- **Aturan:** Satu perangkat hanya terikat ke satu akun; kode pairing kedaluwarsa setelah 15 menit.

**FR-05: Manajemen Multi-Perangkat**
- **Input:** Nama perangkat, lokasi/area, profil tanaman, threshold.
- **Proses:** Simpan konfigurasi per perangkat; tampilkan daftar dan status ringkas.
- **Output:** Daftar perangkat dengan status kondisi terakhir.
- **Aturan:** Pengguna hanya dapat melihat/mengubah perangkat miliknya; penghapusan perangkat memerlukan konfirmasi.

### Modul Monitoring

**FR-06: Ingest Telemetry Real-time**
- **Input:** Payload sensor dari ESP32 melalui MQTT (kelembapan tanah, suhu, kelembapan udara, level air, status pompa, status perangkat, timestamp).
- **Proses:** Validasi skema, simpan pembacaan, perbarui status perangkat, teruskan ke dashboard.
- **Output:** Data tersedia di dashboard ≤ 30 detik; riwayat tersimpan.
- **Aturan:** Payload tidak valid ditolak dan dicatat; data dengan timestamp terlalu lama ditandai.

**FR-07: Dashboard Monitoring Real-time**
- **Input:** Data telemetry terbaru dan status perangkat.
- **Proses:** Tampilkan nilai sensor, status kondisi, alasan status, dan waktu pembacaan terakhir; perbarui otomatis.
- **Output:** Tampilan monitoring per perangkat di mobile dan website.
- **Aturan:** Jika perangkat offline > 2× interval kirim, tampilkan badge offline dan data terakhir.

**FR-08: Klasifikasi Kelembapan Tanah**
- **Input:** Nilai kelembapan tanah (%).
- **Proses:** Bandingkan dengan threshold; hasilkan kategori kering/normal/basah/sangat basah.
- **Output:** Label kondisi tanah dan kontribusinya terhadap status.
- **Aturan:** Menggunakan threshold per perangkat; default sesuai tabel di atas.

**FR-09: Monitoring Suhu & Kelembapan Udara**
- **Input:** Nilai suhu (°C) dan kelembapan udara (%).
- **Proses:** Bandingkan dengan rentang ideal per perangkat.
- **Output:** Status suhu dan kelembapan udara beserta kontribusinya terhadap status.
- **Aturan:** Sensor gagal dibaca → tandai "data tidak tersedia", jangan dianggap NORMAL.

**FR-10: Monitoring Level Air**
- **Input:** Nilai level air tangki (%) dari sensor ultrasonik **HC-SR04** (utama) atau **float switch** (opsional untuk tangki besar), beserta geometri tangki (tinggi sensor ke dasar, level maksimum).
- **Proses:** Konversi jarak HC-SR04 menjadi persentase level, atau baca status digital float switch; bandingkan dengan batas minimal; hasilkan status WATER LOW bila di bawah batas.
- **Output:** Indikator level air dan status WATER LOW.
- **Aturan:** WATER LOW memblokir seluruh aktivitas pompa (otomatis maupun manual). Bila float switch terpasang, float switch menjadi sumber otoritatif untuk kondisi air rendah.

**FR-11: Mesin Status & Deteksi Darurat**
- **Input:** Seluruh pembacaan sensor + threshold per perangkat.
- **Proses:** Terapkan prioritas status, debounce 3 sampel, dan hasilkan alasan.
- **Output:** Status NORMAL/WARNING/CRITICAL/WATER LOW + daftar alasan + timestamp.
- **Aturan:** Perubahan status memicu notifikasi (FR-17/18/19); status yang sama tidak memicu notifikasi berulang kecuali melewati cooldown.

**FR-12: Riwayat & Analitik**
- **Input:** Rentang waktu, perangkat, jenis sensor.
- **Proses:** Ambil data historis dan agregasikan (mentah, per jam, per hari).
- **Output:** Grafik tren, tabel riwayat, dan ekspor CSV (website).
- **Aturan:** Data mentah disimpan 90 hari; agregat harian disimpan 2 tahun.

### Modul Penyiraman

**FR-13: Penyiraman Otomatis**
- **Input:** Status kelembapan tanah, level air, mode otomatis, threshold, durasi maksimal, cooldown.
- **Proses:** Nyalakan pompa bila tanah ≤ batas kering, level air aman, mode otomatis aktif, dan tidak ada emergency stop; hentikan saat target kelembapan tercapai atau durasi maksimal habis.
- **Output:** Aktivitas pompa + catatan penyiraman.
- **Aturan:** Debounce 3 sampel; durasi maksimal default 60 detik; cooldown default 30 menit; WATER LOW atau emergency stop selalu mematikan pompa.

**FR-14: Penyiraman Manual**
- **Input:** Perintah siram + durasi (default 10 detik, maksimum 60 detik).
- **Proses:** Validasi kepemilikan perangkat dan kondisi aman, kirim perintah ke perangkat, konfirmasi status pompa.
- **Output:** Pompa menyala sesuai durasi; status dan log diperbarui.
- **Aturan:** Ditolak jika WATER LOW, perangkat offline, atau emergency stop aktif; perintah memiliki timeout dan ditampilkan bila gagal.

**FR-15: Emergency Stop**
- **Input:** Tombol fisik di perangkat dan/atau tombol di aplikasi.
- **Proses:** Matikan pompa segera, nonaktifkan mode otomatis sampai di-reset, catat kejadian.
- **Output:** Pompa mati; status emergency tampil di dashboard.
- **Aturan:** Emergency stop fisik adalah prioritas tertinggi; reset hanya dapat dilakukan pengguna yang berwenang.

**FR-16: Log Aktivitas Penyiraman**
- **Input:** Kejadian pompa (mulai, berhenti, durasi, pemicu: otomatis/manual/emergency).
- **Proses:** Simpan log dengan timestamp dan perangkat.
- **Output:** Riwayat penyiraman yang dapat difilter.
- **Aturan:** Log tidak dapat dihapus pengguna biasa; tersedia di mobile dan website.

### Modul Peringatan & Pengaturan

**FR-17: Peringatan In-App**
- **Input:** Perubahan status / kejadian darurat.
- **Proses:** Buat entri notifikasi; tampilkan badge dan daftar notifikasi.
- **Output:** Daftar peringatan dengan status baca/belum dibaca.
- **Aturan:** Notifikasi menyertakan perangkat, status, alasan, dan waktu.

**FR-18: Push Notification**
- **Input:** Kejadian yang memenuhi aturan notifikasi.
- **Proses:** Kirim push ke perangkat mobile pengguna yang berlangganan.
- **Output:** Notifikasi muncul di perangkat mobile.
- **Aturan:** Hormati preferensi kanal; gunakan cooldown agar tidak spam.

**FR-19: Notifikasi Telegram**
- **Input:** Kejadian yang memenuhi aturan notifikasi + konfigurasi bot pengguna.
- **Proses:** Kirim pesan melalui Telegram Bot API ke chat yang ditautkan.
- **Output:** Pesan peringatan di Telegram.
- **Aturan:** Kegagalan kirim dicatat dan di-retry terbatas; tautan Telegram dapat dicabut pengguna.

**FR-20: Konfigurasi Threshold & Mode per Perangkat**
- **Input:** Nilai threshold sensor, target kelembapan, durasi maksimal, cooldown, mode otomatis, kanal notifikasi.
- **Proses:** Validasi rentang nilai dan relasi antar-threshold, simpan, sinkronkan ke perangkat.
- **Output:** Konfigurasi aktif dan diterapkan pada evaluasi status serta penyiraman.
- **Aturan:** Critical harus lebih ekstrem dari Warning; target kelembapan harus di atas batas kering; perubahan dicatat di audit log.

---

## 5. Non-Functional Requirements

### Performa
- Waktu muat halaman dashboard < 2 detik pada koneksi 4G.
- Respons API < 500 ms (p95) untuk operasi baca.
- Pembaruan data real-time ≤ 30 detik sejak pembacaan sensor.
- Mendukung minimal 1.000 pengguna aktif dan 5.000 perangkat pada V1.

### Keamanan
- Password di-hash dengan bcrypt/argon2.
- Seluruh komunikasi memakai HTTPS; MQTT memakai TLS.
- Token akses berumur pendek + refresh token; sesi dapat dicabut.
- Otorisasi per perangkat (pengguna hanya mengakses perangkat miliknya).
- Kredensial perangkat unik dan dapat dirotasi; rate limit pada endpoint autentikasi dan kontrol pompa.
- Audit log untuk perubahan konfigurasi dan perintah pompa.

### Keandalan & Offline Behavior
- ESP32 tetap menjalankan penyiraman otomatis berbasis aturan lokal saat internet/MQTT terputus.
- Perangkat menyimpan sementara pembacaan saat offline dan mengirim ulang setelah tersambung.
- Perintah manual yang tidak terkonfirmasi dalam batas waktu ditandai gagal; tidak ada asumsi "berhasil".
- Watchdog perangkat: pompa otomatis mati jika tidak ada kontrol dalam durasi maksimal.
- Deteksi perangkat offline ditampilkan jelas di semua kanal.

### Skalabilitas
- Backend dapat di-scale horizontal; MQTT broker mendukung banyak koneksi perangkat.
- Skema data time-series siap untuk pertumbuhan volume pembacaan.
- **Catatan V1:** implementasi awal memakai SQLite untuk pilot skala kecil (single instance). Target 1.000 pengguna/5.000 perangkat berlaku setelah migrasi ke PostgreSQL/TimescaleDB; jalur migrasi didokumentasikan di Tech Spec.

### Usability & Aksesibilitas
- Responsive: mobile, tablet, desktop.
- Bahasa Indonesia sebagai bahasa utama.
- Status kondisi menggunakan warna + label teks (tidak hanya warna) untuk aksesibilitas.
- Alur utama (lihat status, siram, stop) dapat dilakukan maksimal 2 tap dari home.

### Kompatibilitas
- Mobile: Android 9+ dan iOS 14+.
- Browser: 2 versi terakhir Chrome, Safari, Edge, Firefox.

### Privasi & Data
- Data sensor dan riwayat hanya dapat diakses pemilik akun.
- Retensi: data mentah 90 hari, agregat harian 2 tahun.
- Penghapusan akun menghapus data pribadi dan menonaktifkan perangkat terkait.

---

## 6. Out of Scope & Dependensi

### Out of Scope (V1)
- **Deteksi penyakit/hama berbasis kamera atau AI** — ditunda ke V2.
- **Prediksi kebutuhan air dengan machine learning** — V1 memakai aturan threshold.
- **Identifikasi jenis tanaman otomatis** — profil tanaman dipilih manual.
- **Integrasi smart home (Google Home/Alexa/HomeKit)** — ditunda.
- **Multi-bahasa** — V1 hanya Bahasa Indonesia.
- **Aplikasi desktop native** — website sudah mencakup desktop.
- **Marketplace/e-commerce tanaman** — di luar cakupan produk.
- **Manajemen peran lanjutan (organisasi, izin granular)** — V1 hanya pemilik akun; peran siswa/guru ditunda.

### Dependensi

**Hardware**
- ESP32 sebagai kontroler utama.
- Sensor DHT22 (suhu & kelembapan udara).
- Sensor kelembapan tanah (capacitive).
- **Sensor level air HC-SR04 (utama)** — sensor ultrasonik non-kontak untuk mengukur jarak permukaan air dan menghitung persentase level tangki. Wajib untuk Fitur 5 dan status WATER LOW. Perlu pembagi tegangan pada pin ECHO (5V → 3.3V) karena ESP32 hanya toleran 3.3V.
- **Float switch (opsional)** — alternatif/pelengkap untuk tangki besar atau dalam, di mana pembacaan ultrasonik kurang stabil. Bila dipasang, float switch menjadi sumber otoritatif untuk kondisi air rendah.
- Modul relay, pompa air DC, buzzer, push button (emergency stop).
- Catu daya yang stabil untuk ESP32 dan pompa.

**Software & Layanan**
- MQTT broker (mis. Mosquitto/EMQX) dengan TLS.
- Backend API + database (V1: SQLite; jalur scale: PostgreSQL/TimescaleDB).
- Push notification service (FCM untuk Android, APNs untuk iOS).
- Telegram Bot API.
- Hosting/cloud untuk backend, broker, dan website.
- Email service untuk verifikasi dan reset password.

### Asumsi
- Pengguna memiliki koneksi internet yang cukup stabil untuk monitoring jarak jauh.
- Perangkat memiliki akses listrik dan jaringan Wi-Fi di lokasi tanaman.
- Tangki air diisi ulang secara berkala oleh pengguna.
- Sensor kelembapan tanah dikalibrasi saat pemasangan.
- Geometri tangki diketahui (jarak sensor HC-SR04 ke dasar tangki dan level maksimum) agar jarak dapat dikonversi menjadi persen; float switch opsional untuk tangki besar.
- Satu perangkat mewakili satu titik/area tanaman; banyak perangkat didukung per akun.
- Pengguna menyetujui penggunaan data sensor untuk keperluan monitoring dan riwayat.

### Risiko Utama
- **Pembacaan HC-SR04 terganggu uap/permukaan air bergelombang** → dimitigasi dengan median filter, validasi rentang, dan opsi float switch untuk tangki besar.
- **Kualitas sensor murah** → noise dapat memicu false alarm; dimitigasi dengan debounce dan kalibrasi.
- **Internet putus** → dimitigasi dengan logika lokal di ESP32 dan buffer data.
- **Penyiraman berlebihan** → dimitigasi dengan target kelembapan, durasi maksimal, cooldown, dan emergency stop.

---

## Ringkasan 8 Fitur Utama → Requirement

| No | Fitur | Requirement Terkait |
|---|---|---|
| 1 | Real-time Monitoring | FR-06, FR-07 |
| 2 | Soil Moisture Detection | FR-08, FR-11 |
| 3 | Temperature Monitoring | FR-09, FR-11 |
| 4 | Humidity Monitoring | FR-09, FR-11 |
| 5 | Water Level Monitoring | FR-10, FR-11 |
| 6 | Automatic Watering | FR-13, FR-14, FR-16 |
| 7 | Emergency Detection | FR-11, FR-17, FR-18, FR-19 |
| 8 | IoT Dashboard | FR-07, FR-12, FR-16, FR-20 |

---

**Langkah berikutnya:** review PRD ini, lalu lanjut membuat Tech Spec (arsitektur backend, skema MQTT, model data, dan kontrak API) sebelum implementasi.
