# LabStock Assistant

Elektronik bileşen ve malzeme **stok takibi** ile **depo sohbeti** (LLM) bir arada. **Electron** masaüstü uygulaması olarak çalışır; arayüz React + TypeScript + Tailwind ile geliştirilmiştir.

> **English:** Desktop inventory assistant for electronic parts with optional cloud LLM chat (Groq / Gemini), Excel import/export, local persistence, and a simple admin PIN for read-only guests on the same machine.

---

## Özellikler

### Stok ve kayıt

- **Kayıt** ekranında kategorilere göre filtreleme, metin araması (MPN, açıklama, konum vb.).
- **Tekil parça ekleme** (sol panel formu) ve **Excel (.xlsx / .xls) ile toplu içe aktarma**; şablona uygun başlık satırı ile çalışır.
- Tabloda satır bazında **adet artırma / azaltma** (− / +).
- **MPN** satırında **LCSC, Mouser, DigiKey** arama bağlantıları (API anahtarı gerekmez; tarayıcıda arama sayfası açılır).

### Depo sohbeti (LLM)

- **Sohbet** ekranında stok listesi modele bağlam olarak eklenir; yanıtlar kayıtlı envantere dayanır.
- **Groq** ve **Google Gemini** desteği; anahtarlar **Ayarlar**’da yerel olarak saklanır.
- İki anahtar da tanımlıysa (ör. Gemini **429** kota) uygulama sırayla alternatif sağlayıcıyı dener.
- İstekler **Electron ana sürecinden** gider (CORS sorunu yok).
- Bulut kullanılamazsa **yerel özet** (`localInventoryAssistant` + `termExpansions`) devreye girer.

### Veri kalıcılığı ve yedek

- Stok ve **denetim günlüğü** otomatik kaydedilir:
  - **Electron:** `userData` altında `labstock-data.json` (yol **Ayarlar**’da gösterilir).
  - **Tarayıcı / önizleme:** `localStorage` yedeği (`labstock.data.v1`).
- **JSON yedek:** Tam yedek (stok + audit + sürüm bilgisi) indirme ve geri yükleme.
- **Excel:** Mevcut stok listesini `.xlsx` olarak dışa aktarma (paylaşım / rapor).

### Denetim (audit)

- Adet değişimi, yeni parça, Excel birleştirme ve JSON geri yükleme işlemleri **zaman damgalı günlüğe** yazılır.
- **Ayarlar**’da “Denetim günlüğünde görünen ad” ile kayıtlarda görünen etiket ayarlanır.
- Günlük boyutu üst sınır ile sınırlıdır (performans için).

### Basit erişim: yönetici PIN ve salt okunur

- **Ayarlar → Basit erişim** ile isteğe bağlı **yönetici PIN**i tanımlanır (SHA-256 özeti saklanır).
- PIN varken varsayılan mod **salt okunur:** tablo ve panelde düzenleme kapalı; üst bardan PIN ile **yönetici oturumu** açılır (sekme bazlı, `sessionStorage`).
- PIN yokken davranış eskisi gibi: herkes düzenleyebilir.
- Bu model **aynı bilgisayar / tarayıcı profili** içindir; kurumsal kimlik doğrulama değildir.

### Giriş ekranı

- Uygulama **`/`** adresinde **Depo girişi** karşılama sayfası ile açılır: depo tablosu, sohbet ve ayarlara kısayollar; çoklu cihazda paylaşım hakkında kısa bilgi.

### Tasarım

- Tutarlı arayüz: `ls.*` renk token’ları, kartlar (`ls-card`), tipografi (Inter / JetBrains Mono), marka gradyanı ve gölgeler.
- Sohbet alanı geniş içerik sütununa göre ölçeklenir.

### Gelecek / isteğe bağlı bulut

- **`supabase/migrations`** altında çok kullanıcılı ortak depo ve RBAC için **SQL iskeleti** bulunur (henüz uygulama akışına tam bağlı değil).
- `VITE_SUPABASE_URL` ve `VITE_SUPABASE_ANON_KEY` tanımlanırsa `@supabase/supabase-js` ile istemci oluşturulabilir (`src/lib/supabase/client.ts`).

---

## Ekranlar ve rotalar

| Rota        | Açıklama                                      |
| ----------- | --------------------------------------------- |
| `/`         | Giriş (karşılama)                             |
| `/sohbet`   | Depo sohbeti (Groq / Gemini + yerel yedek)    |
| `/kayit`    | Stok tablosu, Excel, tedarikçi linkleri      |
| `/ayarlar`  | Genel, AI anahtarları, PIN, veri / yedek, audit |

Üst menü: **Giriş · Sohbet · Kayıt · Ayarlar**.

---

## Teknoloji yığını

| Bileşen        | Not                                           |
| -------------- | --------------------------------------------- |
| Electron       | Ana süreç, pencere, IPC, kalıcı dosya yazımı  |
| Vite + React 18| Arayüz derlemesi                              |
| TypeScript     | Tip güvenliği                                 |
| Tailwind CSS   | Stil ve tasarım token’ları                    |
| react-router-dom | Hash router (`HashRouter`)                  |
| xlsx           | Excel okuma / yazma                           |
| electron-updater | Güncelleme altyapısı (projede mevcut)      |
| Vitest + Playwright | `npm test` (e2e ortamına bağlı)         |

---

## Kurulum

```bash
npm install
```

### Ortam değişkenleri (isteğe bağlı)

Kök dizinde `.env.example` dosyasına bakın. Supabase kullanacaksanız:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Tanımlı değilse uygulama **yalnızca yerel** modda çalışır.

---

## Geliştirme

```bash
npm run dev
```

Vite geliştirme sunucusu ve Electron birlikte başlar. Sohbet köprüsü ve kalıcı dosya için **Electron** içinde çalıştırmanız gerekir.

---

## Derleme

```bash
npm run build
```

`package.json` içinde tanımlı akış: TypeScript kontrolü, Vite üretim derlemesi ve `electron-builder`.

---

## Test

```bash
npm test
```

Önkoşul: `pretest` aşamasında üretim benzeri derleme yapılır. E2E testleri Playwright ile Electron başlatır; CI veya masaüstü ortamında başlatma kısıtları nedeniyle atlanabilir veya başarısız olabilir.

---

## Veri paylaşımı (çoklu bilgisayar)

Uygulama **varsayılan olarak cihaz yerelidir.** Farklı kişilerin kendi PC’lerinde **aynı anlık depoyu** görmesi için bugün pratik yol:

1. Yönetici **Ayarlar → JSON yedek indir** ile dosyayı alır.
2. Güvenli kanal ile paylaşır.
3. Karşı tarafta **JSON yedek yükle** ile içe aktarır.

Gerçek zamanlı ortak depo ve hesaplar için ileride Supabase (veya benzeri) backend entegrasyonu hedeflenir.

---

## Proje yapısı (özet)

```
electron/main/       # Ana süreç, IPC (sohbet, kalıcı dosya)
electron/preload/    # contextBridge API (labstock.*)
src/pages/           # Giriş, Sohbet (HomePage), Kayıt, Ayarlar
src/context/         # InventoryProvider, SimpleAccessProvider
src/components/      # Sohbet paneli, sidebar, modal, linkler
src/lib/             # Excel, labData, ayarlar, yerel asistan, Supabase istemci
supabase/migrations/ # İsteğe bağlı çok kullanıcı SQL iskeleti
```

---

## Lisans

MIT — ayrıntılar için `LICENSE` dosyasına bakın.
