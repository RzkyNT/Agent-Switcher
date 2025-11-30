# User-Agent Manager & Switcher Extension

## Deskripsi Singkat
Ekstensi Chrome "User-Agent Manager & Switcher" memungkinkan pengguna untuk dengan mudah mengelola, mengganti, dan menyesuaikan string User-Agent (UA) yang dikirim browser mereka ke situs web. Ini mencakup preset UA populer, kemampuan untuk menambahkan UA kustom, menetapkan aturan UA spesifik domain, dan mengaktifkan/menonaktifkan fungsionalitas ekstensi. Tujuannya adalah untuk membantu pengembang web dalam menguji situs mereka pada berbagai kondisi browser dan sistem operasi, serta bagi pengguna yang ingin mengubah identitas browser mereka.

## Cara Kerja Umum
Ekstensi ini beroperasi melalui dua komponen utama:

1.  **Background Service Worker (`background.js`):** Ini adalah jantung ekstensi, berjalan di latar belakang. Tugas utamanya adalah memodifikasi header permintaan jaringan (`User-Agent`) menggunakan API `chrome.declarativeNetRequest`. Ketika pengguna memilih User-Agent baru atau mengubah pengaturan, skrip latar belakang menerima instruksi dan memperbarui aturan jaringan secara dinamis.
2.  **Popup Interface (`popup.html` dan `popup.js`):** Ini adalah antarmuka pengguna yang terlihat saat ikon ekstensi diklik. `popup.html` menyediakan struktur visual (tombol, dropdown, input), dan `popup.js` menangani semua interaksi pengguna, membaca dan menulis pengaturan ke penyimpanan lokal Chrome, serta berkomunikasi dengan skrip latar belakang.

## Fitur Utama
*   **Penggantian User-Agent Cepat:** Pilih dari daftar preset atau UA kustom.
*   **Manajemen User-Agent Kustom:** Tambah, edit, dan hapus string User-Agent Anda sendiri.
*   **Aturan Spesifik Domain:** Terapkan User-Agent yang berbeda secara otomatis untuk situs web tertentu.
*   **Status Ekstensi:** Aktifkan atau nonaktifkan fungsionalitas ekstensi secara keseluruhan.
*   **Impor/Ekspor Pengaturan:** Cadangkan dan pulihkan konfigurasi ekstensi Anda.
*   **Tombol Reset:** Kembalikan semua pengaturan ke default.
*   **Mode Layar Penuh:** Masuk ke mode layar penuh untuk tab aktif.

## Struktur Kode Penting

### `manifest.json`
File ini adalah cetak biru ekstensi. Ini mendefinisikan nama, versi, deskripsi, izin yang diperlukan (`storage`, `declarativeNetRequest`, `tabs`, `scripting`), dan skrip latar belakang serta file popup.
```json
{
  "manifest_version": 3,
  "name": "User-Agent Manager & Switcher",
  "version": "2.0",
  "description": "Manage, switch, and customize User-Agent strings with presets.",
  "permissions": [
    "storage",
    "declarativeNetRequest",
    "declarativeNetRequestFeedback",
    "tabs",
    "activeTab",
    "scripting"
  ],
  "host_permissions": ["<all_urls>"],
  "action": {
    "default_popup": "popup.html",
    "default_icon": {
      "16": "icon.png",
      "48": "icon.png",
      "128": "icon.png"
    }
  },
  "background": {
    "service_worker": "background.js"
  },
  "declarative_net_request": {
    "rule_resources": [
      {
        "id": "ruleset_1",
        "enabled": true,
        "path": "rules.json"
      }
    ]
  },
  "icons": {
    "16": "icon.png",
    "48": "icon.png",
    "128": "icon.png"
  }
}
```
**Kode Penting:**
*   `"permissions"`: Mengizinkan ekstensi untuk menyimpan data, memodifikasi permintaan jaringan, dan berinteraksi dengan tab.
*   `"host_permissions": ["<all_urls>"]`: Memberikan izin untuk beroperasi di semua URL.
*   `"background": { "service_worker": "background.js" }`: Menentukan skrip latar belakang.
*   `"declarative_net_request"`: Menyiapkan ekstensi untuk menggunakan API `declarativeNetRequest`.

### `background.js`
Ini adalah skrip latar belakang (service worker). Ini bertanggung jawab untuk:
*   Inisialisasi pengaturan default saat instalasi.
*   Memuat dan menerapkan User-Agent yang disimpan dari `chrome.storage.local`.
*   Menggunakan `chrome.declarativeNetRequest.updateDynamicRules` untuk menambah, menghapus, dan memperbarui aturan yang memodifikasi header User-Agent.
*   Mendengarkan pesan dari `popup.js` untuk mengaktifkan/menonaktifkan ekstensi, menerapkan UA baru, dll.
*   Menangani aturan spesifik domain dengan prioritas lebih tinggi.

```javascript
// Cuplikan Kode Penting dari background.js

// Default User-Agents presets
const DEFAULT_USER_AGENTS = { /* ... */ };

// Initialize storage with default values
async function initializeStorage() { /* ... */ }

// Load and apply saved User-Agent
async function loadAndApplyUserAgent() { /* ... */ }

// Apply User-Agent via declarativeNetRequest
async function applyUserAgent(userAgent, domainRules = {}) {
  // ... menghapus aturan yang ada ...
  // ... membuat aturan baru untuk UA global dan domain-spesifik ...
  await chrome.declarativeNetRequest.updateDynamicRules({ addRules: newRules });
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'applyUserAgent') { /* ... */ }
  // ... penanganan pesan lainnya ...
});

// Listen for storage changes
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local') {
    if (changes.activeUA || changes.enabled || changes.domainRules) {
      loadAndApplyUserAgent();
    }
  }
});
```
**Kode Penting:**
*   `applyUserAgent` function: Fungsi inti yang bertanggung jawab untuk memanipulasi aturan `declarativeNetRequest` untuk mengganti User-Agent.
*   `chrome.runtime.onMessage.addListener`: Mekanisme komunikasi dengan popup.
*   `chrome.storage.onChanged.addListener`: Memastikan aturan diperbarui secara real-time saat pengaturan penyimpanan berubah.

### `popup.html`
Ini adalah struktur HTML untuk antarmuka pengguna popup ekstensi. Ini mencakup:
*   Header dan deskripsi.
*   Toggle untuk mengaktifkan/menonaktifkan ekstensi.
*   Tiga tab: "Switcher" (untuk pemilihan UA cepat), "Manager" (untuk UA kustom), dan "Settings" (untuk aturan domain, impor/ekspor, dll.).
*   Elemen formulir seperti dropdown, input teks, tombol, dan area teks.
*   CSS yang kaya untuk tata letak dan gaya.

```html
<!-- Cuplikan Kode Penting dari popup.html -->

<div class="header">
  <h2>🔧 User-Agent Manager & Switcher</h2>
  <p>Manage and switch User-Agent strings</p>
</div>

<div class="toggle-switch">
  <label>
    Extension Status
    <span id="statusBadge" class="badge badge-success">ENABLED</span>
  </label>
  <label class="switch">
    <input type="checkbox" id="extensionToggle" checked />
    <span class="slider"></span>
  </label>
</div>

<div class="tabs">
  <button class="tab active" data-tab="switcher">🔄 Switcher</button>
  <button class="tab" data-tab="manager">📝 Manager</button>
  <button class="tab" data-tab="settings">⚙️ Settings</button>
</div>

<!-- ... konten tab lainnya ... -->

<script src="popup.js"></script>
```
**Kode Penting:**
*   Elemen dengan ID seperti `extensionToggle`, `userAgentSelect`, `addCustomUABtn`, `domainRules`: Ini adalah titik interaksi utama yang akan ditargetkan oleh `popup.js`.
*   `script src="popup.js"`: Menghubungkan logika JavaScript ke UI.

### `popup.js`
Skrip ini mengelola semua logika sisi klien untuk antarmuka popup:
*   Menginisialisasi UI berdasarkan pengaturan yang disimpan.
*   Merespons interaksi pengguna (klik tombol, perubahan dropdown, dll.).
*   Membaca dan menulis data ke `chrome.storage.local`.
*   Mengirim pesan ke `background.js` untuk memicu perubahan User-Agent.
*   Menyediakan fungsi untuk menambahkan/menghapus UA kustom dan aturan domain.
*   Menangani impor/ekspor pengaturan dan reset.

```javascript
// Cuplikan Kode Penting dari popup.js

// Inisialisasi popup saat DOM dimuat
document.addEventListener("DOMContentLoaded", init);

async function init() { /* ... */ }

// Load settings from storage and update UI
async function loadSettings() { /* ... */ }

// Populate User-Agent select dropdown
async function populateUserAgentSelect() { /* ... */ }

// Handle apply button
async function handleApplyButton() {
  const selectedUA = elements.userAgentSelect.value;
  await activateUserAgent(selectedUA);
}

// Activate User-Agent (sends message to background.js)
async function activateUserAgent(key) {
  // ... menyiapkan data ...
  const response = await chrome.runtime.sendMessage({
    action: "applyUserAgent",
    data: { uaKey: key, userAgent: userAgent, domainRules: data.domainRules || {} },
  });
  // ... menangani respons dan memperbarui UI ...
}

// Handle add custom UA
async function handleAddCustomUA() { /* ... */ }

// Handle add domain rule
async function handleAddDomainRule() { /* ... */ }

// Handle extension toggle (sends message to background.js)
async function handleExtensionToggle(e) {
  const enabled = e.target.checked;
  await chrome.storage.local.set({ enabled });
  await chrome.runtime.sendMessage({ action: enabled ? "enable" : "disable" });
}

// Handle Fullscreen button (uses chrome.scripting API)
async function handleFullscreenButton() {
  const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
  await chrome.scripting.executeScript({
    target: { tabId: activeTab.id },
    func: () => {
      document.documentElement.requestFullscreen();
    },
  });
}
```
**Kode Penting:**
*   `init()`: Fungsi startup yang mengatur semua elemen UI dan pendengar acara.
*   `activateUserAgent()`: Fungsi yang bertanggung jawab untuk mengambil UA yang dipilih dan mengirimkannya ke `background.js` untuk diterapkan.
*   `handleExtensionToggle()`: Mengontrol status aktif ekstensi dan berkomunikasi dengan `background.js`.
*   `handleFullscreenButton()`: Contoh penggunaan `chrome.scripting` untuk berinteraksi dengan DOM halaman web aktif.

### `rules.json`
File ini ditemukan kosong (`[]`). Ini menunjukkan bahwa ekstensi ini tidak menggunakan aturan `declarativeNetRequest` statis yang dimuat langsung dari file. Sebaliknya, semua aturan (`id`, `priority`, `action`, `condition`) dikelola dan diperbarui secara dinamis oleh `background.js` menggunakan `chrome.declarativeNetRequest.updateDynamicRules()`. Entri di `manifest.json` yang mengacu pada `rules.json` kemungkinan besar hanya untuk memastikan izin `declarativeNetRequest` diberikan oleh browser.

## Alur Kerja Utama (Contoh: Mengganti User-Agent)

1.  **Pengguna Membuka Popup:** Pengguna mengklik ikon ekstensi di toolbar browser.
2.  **`popup.js` Inisialisasi:** `popup.js` memuat pengaturan yang disimpan dari `chrome.storage.local` (User-Agent aktif, UA kustom, aturan domain) dan mengisi dropdown serta menampilkan status UA saat ini.
3.  **Pengguna Memilih UA Baru:** Pengguna memilih User-Agent dari dropdown di tab "Switcher" dan mengklik tombol "Apply".
4.  **`popup.js` Mengirim Pesan:** Fungsi `handleApplyButton` di `popup.js` memanggil `activateUserAgent`. `activateUserAgent` kemudian mengambil string User-Agent lengkap dan mengirim pesan (`action: 'applyUserAgent'`) ke `background.js`, termasuk UA yang dipilih dan aturan domain yang relevan.
5.  **`background.js` Menerima Pesan:** `background.js` menerima pesan ini melalui `chrome.runtime.onMessage.addListener`.
6.  **`background.js` Memperbarui Aturan Jaringan:** Fungsi `applyUserAgent` di `background.js` dipanggil.
    *   Pertama, ia menghapus semua aturan `declarativeNetRequest` dinamis yang sebelumnya ditetapkan oleh ekstensi.
    *   Kemudian, ia membuat aturan `modifyHeaders` baru. Satu aturan akan menetapkan User-Agent yang dipilih secara global ke semua permintaan. Jika ada aturan spesifik domain, aturan tambahan dengan prioritas lebih tinggi akan dibuat untuk domain tersebut.
    *   Aturan-aturan baru ini kemudian diterapkan menggunakan `chrome.declarativeNetRequest.updateDynamicRules({ addRules: newRules })`.
7.  **`popup.js` Memperbarui UI:** Setelah `background.js` berhasil menerapkan perubahan, ia mengirim respons ke `popup.js`. `popup.js` kemudian memperbarui tampilan User-Agent saat ini dan menunjukkan pesan sukses kepada pengguna.
8.  **Permintaan Browser Berikutnya:** Mulai saat ini, semua permintaan jaringan yang cocok dengan aturan (misalnya, semua permintaan ke semua URL, atau permintaan ke domain spesifik yang diatur) akan menyertakan header User-Agent yang telah dimodifikasi, sampai User-Agent diubah lagi atau ekstensi dinonaktifkan.

## Teknologi / API Chrome yang Digunakan
*   **`chrome.storage`:** Digunakan untuk menyimpan pengaturan ekstensi secara persisten, seperti User-Agent yang aktif, daftar UA kustom, dan aturan domain.
*   **`chrome.declarativeNetRequest`:** API kunci untuk memodifikasi, memblokir, atau mengalihkan permintaan jaringan secara efisien dan aman tanpa memerlukan skrip latar belakang untuk mencegat setiap permintaan. Ini digunakan untuk mengganti header User-Agent.
*   **`chrome.runtime`:** Digunakan untuk komunikasi antara popup dan service worker (`chrome.runtime.onMessage`, `chrome.runtime.sendMessage`), dan untuk mendeteksi peristiwa instalasi/pembaruan ekstensi (`chrome.runtime.onInstalled`).
*   **`chrome.tabs`:** Digunakan untuk mendapatkan informasi tentang tab aktif, seperti yang terlihat pada fungsi layar penuh.
*   **`chrome.scripting`:** Digunakan oleh `popup.js` untuk menyuntikkan dan mengeksekusi kode JavaScript langsung di halaman web aktif, misalnya untuk memicu mode layar penuh.
