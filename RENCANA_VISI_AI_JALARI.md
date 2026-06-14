# RENCANA IMPLEMENTASI: VISI AI KLASIFIKASI LIMBAH ORGANIK
## Adaptasi Notebook Kaggle "Fruits & Vegetables — MobileNetV2" ke Proyek JALARI

**Sumber referensi:** https://www.kaggle.com/code/nimapourmoradi/fruits-and-vegetables-image-mobilenetv2
**Dataset:** [Fruits and Vegetables Image Recognition (Kritik Seth)](https://www.kaggle.com/datasets/kritikseth/fruit-and-vegetable-image-recognition)
**Tim:** Adelio Fahri F. & Rafael M.E.S. — SMAN 3 Yogyakarta — OPSI 2026 (FTR)
**Versi rencana:** 1.0 · 14 Juni 2026

---

## 1. ANALISIS NOTEBOOK KAGGLE

### 1.1 Ringkasan teknis notebook
Notebook melakukan **transfer learning** menggunakan MobileNetV2 (pre-trained ImageNet) untuk mengklasifikasi citra buah & sayur ke 36 kelas.

| Komponen | Spesifikasi pada notebook |
|----------|---------------------------|
| **Dataset** | 36 kelas; 3.115 gambar train, 359 validation, 351 test (folder `train/`, `validation/`, `test/`) |
| **Input size** | 224 × 224 × 3 (default MobileNetV2) |
| **Preprocessing** | Resize 224×224, normalisasi `mobilenet_v2.preprocess_input` → rentang [-1, 1] |
| **Augmentasi** | rotation, zoom, width/height shift, horizontal flip (via `ImageDataGenerator`) |
| **Base model** | `MobileNetV2(weights='imagenet', include_top=False)`, `trainable=False` (di-freeze) |
| **Head kustom** | `GlobalAveragePooling2D → Dropout → Dense(36, softmax)` |
| **Kompilasi** | Optimizer Adam, loss `categorical_crossentropy`, metrik `accuracy` |
| **Callbacks** | EarlyStopping, ReduceLROnPlateau, ModelCheckpoint |
| **Hasil** | Akurasi validasi ± 95–97% (referensi arsitektur sejenis mencapai 97,31%) |
| **Inferensi** | Load gambar → resize → preprocess → `model.predict` → `argmax` → label kelas |
| **Library** | tensorflow/keras, numpy, pandas, matplotlib, PIL, scikit-learn |

### 1.2 Daftar 36 kelas
- **Buah (11):** apple, banana, grapes, kiwi, lemon, mango, orange, pear, pineapple, pomegranate, watermelon
- **Sayur (25):** beetroot, bell pepper, cabbage, capsicum, carrot, cauliflower, chilli pepper, corn, cucumber, eggplant, garlic, ginger, jalepeno, lettuce, onion, paprika, peas, potato, raddish, soy beans, spinach, sweetcorn, sweetpotato, tomato, turnip

---

## 2. RELEVANSI DENGAN JALARI (Mengapa fitur ini bernilai)

**Kondisi saat ini di kode** ([public/js/main.js](public/js/main.js)):
- Limbah hanya dipisah **Organik vs Anorganik** (dua load cell). Donut "Komposisi" di [main.js:256](public/js/main.js#L256) & [main.js:274](public/js/main.js#L274) hanya menampilkan 2 segmen.
- Sub-kategori organik (Nasi 35%, Lauk 25%, Sayur 20%, Buah 10%, Lainnya 10%) di dokumentasi [FITUR_JALARI_V3.md](FITUR_JALARI_V3.md) bagian C3 masih **persentase tetap dari literatur**, bukan deteksi nyata.
- "AI" yang ada baru berupa *rule-based recommendation* + XAI ([main.js:306](public/js/main.js#L306) `updateAI`, [main.js:376](public/js/main.js#L376) blok XAI). Belum ada machine learning sungguhan.

**Nilai tambah Visi AI:**
1. Mengganti persentase statis sub-kategori menjadi **klasifikasi citra nyata** atas limbah buah & sayur → donut komposisi menjadi data-driven.
2. Menambahkan **deep learning sesungguhnya** ke proyek — diferensiasi kuat untuk OPSI 2026 (judul "Berbasis AIoT" jadi terbukti, bukan hanya rule-based).
3. Mendukung **kategorisasi otomatis** pada Protokol Pengukuran Step 3 ([FITUR_JALARI_V3.md](FITUR_JALARI_V3.md) E5) yang saat ini manual.
4. Relevan dengan metode pengolahan: identifikasi buah/sayur mendukung pemilihan metode **POC/Eco-Enzyme** (cocok untuk buah) vs **composting/BSF** ([main.js:27](public/js/main.js#L27) `poc`).

**Keterbatasan jujur yang harus disebut di laporan:** dataset Kaggle hanya buah & sayur *utuh/segar*, sedangkan limbah MBG juga mengandung **nasi, lauk, dan sisa makanan tercampur**. Maka model ini menangani sub-kategori **Sayur & Buah** secara akurat; Nasi/Lauk/Lainnya tetap perlu pendekatan lain (fase 2 — dataset kustom). Ini harus dinyatakan transparan (sejalan dengan semangat XAI proyek).

---

## 3. KEPUTUSAN ARSITEKTUR (paling penting)

JALARI = **static site serverless di Firebase Hosting, vanilla JS, tanpa backend** ([firebase.json](firebase.json)). Maka strategi deployment model:

| Opsi | Cara | Cocok? |
|------|------|--------|
| **A. TensorFlow.js in-browser** ✅ **(REKOMENDASI)** | Konversi model Keras → format TF.js, inferensi 100% di browser | **Ya** — nol backend, nol biaya server, jalan offline, konsisten dengan arsitektur SPA |
| B. Cloud Function (Python) | Endpoint HTTP menjalankan model `.h5` | Menambah biaya & cold-start, melanggar prinsip "serverless statis" |
| C. Hybrid ESP32-CAM | ESP32-CAM → Firebase Storage → inferensi | Untuk fase hardware nyata (lanjutan), bukan MVP |

**Keputusan: Opsi A (TensorFlow.js).** Model MobileNetV2 yang dikuantisasi ± 3–4 MB, cukup ringan dimuat di browser dan di-*lazy-load* hanya saat halaman Visi AI dibuka.

---

## 4. RENCANA BERTAHAP (LANGKAH TEKNIS)

### FASE 1 — Replikasi & Latih Model (Google Colab / Kaggle)
**Output:** `model.h5` + `labels.json`

1. **Setup environment** (Colab GPU gratis atau Kaggle Notebook):
   ```python
   import tensorflow as tf
   from tensorflow.keras.applications import MobileNetV2
   from tensorflow.keras.applications.mobilenet_v2 import preprocess_input
   from tensorflow.keras.layers import GlobalAveragePooling2D, Dropout, Dense
   from tensorflow.keras.models import Model
   ```
2. **Unduh dataset** Kritik Seth via Kaggle API (`kaggle datasets download -d kritikseth/fruit-and-vegetable-image-recognition`).
3. **Data pipeline** (replikasi notebook):
   ```python
   IMG=224; BATCH=32
   train_gen = tf.keras.preprocessing.image.ImageDataGenerator(
       preprocessing_function=preprocess_input,
       rotation_range=20, zoom_range=0.2,
       width_shift_range=0.1, height_shift_range=0.1, horizontal_flip=True)
   val_gen = tf.keras.preprocessing.image.ImageDataGenerator(preprocessing_function=preprocess_input)
   train = train_gen.flow_from_directory('train', target_size=(IMG,IMG), batch_size=BATCH, class_mode='categorical')
   val   = val_gen.flow_from_directory('validation', target_size=(IMG,IMG), batch_size=BATCH, class_mode='categorical')
   ```
4. **Bangun model** (transfer learning, base di-freeze):
   ```python
   base = MobileNetV2(weights='imagenet', include_top=False, input_shape=(IMG,IMG,3))
   base.trainable = False
   x = GlobalAveragePooling2D()(base.output)
   x = Dropout(0.3)(x)
   out = Dense(train.num_classes, activation='softmax')(x)
   model = Model(base.input, out)
   model.compile(optimizer=tf.keras.optimizers.Adam(1e-3), loss='categorical_crossentropy', metrics=['accuracy'])
   ```
5. **Latih** dengan callbacks (EarlyStopping `patience=4`, ReduceLROnPlateau, ModelCheckpoint), ± 15–20 epoch.
6. *(Opsional)* **Fine-tuning**: unfreeze 30 layer teratas base, lanjut latih dengan LR kecil (1e-5) untuk dorong akurasi.
7. **Simpan** `model.save('jalari_vision.h5')` dan tulis `labels.json` dari `train.class_indices` (urutan indeks → nama kelas).
8. **Catat metrik** (akurasi, confusion matrix, classification report) → masuk laporan ilmiah & halaman "Tentang Model".

### FASE 2 — Konversi ke TensorFlow.js
**Output:** `public/model/model.json`, `group1-shard*.bin`, `public/model/labels.json`

1. Install converter: `pip install tensorflowjs`.
2. Konversi + **kuantisasi** (perkecil ukuran ± 4× tanpa drop akurasi berarti):
   ```bash
   tensorflowjs_converter --input_format keras \
       --quantize_uint8 \
       jalari_vision.h5 public/model/
   ```
3. Salin `labels.json` ke `public/model/`.
4. Buat juga **`category_map.json`** — pemetaan 36 kelas → 5 sub-kategori Jalari:
   ```json
   {
     "buah":  ["apple","banana","grapes","kiwi","lemon","mango","orange","pear","pineapple","pomegranate","watermelon"],
     "sayur": ["beetroot","bell pepper","cabbage","capsicum","carrot","cauliflower","chilli pepper","corn","cucumber","eggplant","garlic","ginger","jalepeno","lettuce","onion","paprika","peas","potato","raddish","soy beans","spinach","sweetcorn","sweetpotato","tomato","turnip"]
   }
   ```

### FASE 3 — Integrasi Frontend (inti pekerjaan kode)
**Output:** halaman & modul baru di SPA, tanpa merusak arsitektur yang ada.

1. **Tambah library** di [public/index.html](public/index.html#L10) (setelah Chart.js):
   ```html
   <script src="https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.x/dist/tf.min.js"></script>
   ```
2. **Buat modul baru** `public/js/vision.js` (di-load sebelum `main.js`). Tanggung jawab:
   - `loadVisionModel()` — *lazy-load* `tf.loadLayersModel('model/model.json')` (hanya saat halaman Visi AI dibuka pertama kali; cache di variabel global).
   - `preprocess(imgEl)` — replikasi `preprocess_input` di JS:
     ```js
     function preprocess(imgEl){
       return tf.tidy(function(){
         var t = tf.browser.fromPixels(imgEl).resizeBilinear([224,224]).toFloat();
         return t.div(127.5).sub(1).expandDims(0); // skala ke [-1,1]
       });
     }
     ```
   - `classify(imgEl)` — `model.predict` → ambil top-3 probabilitas → map ke `category_map` → kembalikan `{label, confidence, kategori, top3[]}`.
3. **Daftarkan halaman baru "Visi AI"** mengikuti pola router yang sudah ada:
   - Tambah ke objek `PAGES` ([main.js:96](public/js/main.js#L96)): `vision:'Visi AI'`.
   - Tambah `vision:pgVision` di map fungsi `go()` ([main.js:99](public/js/main.js#L99)).
   - Tambah `<a>` menu di sidebar grup "Analitik" ([public/index.html](public/index.html#L60)).
   - Tulis fungsi `pgVision(pc)` — UI berisi:
     - Tombol **Upload Gambar** (`<input type="file" accept="image/*">`) **dan** **Ambil dari Kamera** (`getUserMedia`, untuk demo & jalur ESP32-CAM nanti).
     - Preview gambar + tombol "Klasifikasi".
     - Hasil: kategori (Buah/Sayur), label spesifik, **confidence bar** (gaya `xai-bar` yang sudah ada di [main.js:239](public/js/main.js#L239) — konsisten dengan tema XAI), dan **top-3** prediksi.
     - Catatan transparansi keterbatasan model (lihat §2).
4. **Hubungkan hasil ke data komposisi** — ini menjadikan fitur bermakna, bukan sekadar demo:
   - Tambah state komposisi di `S`, mis. `S.comp = {nasi:0, lauk:0, sayur:0, buah:0, lainnya:0}`.
   - Setiap klasifikasi menambah hitungan kategori terdeteksi → simpan ke `localStorage` (`jalari_komposisi`).
   - Ubah donut "Komposisi" Beranda ([main.js:274](public/js/main.js#L274)) dari 2-segmen statis menjadi **5-segmen sub-kategori organik berbasis deteksi** (fallback ke persentase literatur bila belum ada data). Gunakan `mkDoughnut` yang sudah ada ([main.js:93](public/js/main.js#L93)).
5. **XAI ringan** — tampilkan top-3 confidence sebagai penjelasan ("mengapa AI memutuskan X"), selaras dengan komponen XAI proyek ([main.js:376](public/js/main.js#L376)). Opsional lanjutan: **Grad-CAM** heatmap untuk menyorot area gambar yang menentukan.

### FASE 4 — (Lanjutan) Jalur Hardware ESP32-CAM
Untuk implementasi nyata pasca-MVP, selaras dengan halaman Device:
1. ESP32-CAM memotret limbah di wadah → unggah JPEG ke **Firebase Storage**.
2. Trigger: browser dashboard mengambil gambar terbaru → jalankan inferensi TF.js (tetap client-side), **atau** Cloud Function Python untuk inferensi otomatis.
3. Hasil komposisi ditulis ke Firebase RTDB/Firestore → dashboard membaca real-time (menggantikan mode simulator di [main.js:111](public/js/main.js#L111)).

### FASE 5 — Pengujian, Performa, Dokumentasi
1. **Performa:** ukur waktu load model & inferensi; pastikan model di-*lazy-load* dan di-cache. Target model terkuantisasi < 5 MB, inferensi < 1 dtk di laptop kelas menengah.
2. **Akurasi lapangan:** uji dengan foto limbah nyata MBG (bukan hanya gambar dataset bersih) → catat di laporan sebagai validasi eksternal.
3. **Update dokumentasi:** tambahkan bab fitur Visi AI ke [FITUR_JALARI_V3.md](FITUR_JALARI_V3.md), referensi MobileNetV2 ke [LITERATURE_REVIEW_JALARI.md](LITERATURE_REVIEW_JALARI.md), dan halaman "Tentang" ([main.js:438](public/js/main.js#L438)) → tambah baris arsitektur model + akurasi.

---

## 5. PERUBAHAN FILE (RINGKAS)

| File | Perubahan |
|------|-----------|
| `public/model/` *(baru)* | `model.json`, `group1-shard*.bin`, `labels.json`, `category_map.json` |
| `public/js/vision.js` *(baru)* | Load model, preprocessing, `classify`, halaman `pgVision` |
| [public/index.html](public/index.html) | +script tfjs; +script vision.js; +menu sidebar "Visi AI" |
| [public/js/main.js](public/js/main.js) | +entri router `vision`; modifikasi donut komposisi (5-segmen); state `S.comp` + persistence |
| [firebase.json](firebase.json) | (cek) pastikan `public/model/**` ikut ter-deploy; set header cache untuk `.bin` |
| Dok. `.md` | Update FITUR, LITERATURE_REVIEW, bab "Tentang Model" |

---

## 6. RISIKO & MITIGASI

| Risiko | Mitigasi |
|--------|----------|
| Dataset ≠ limbah MBG nyata (nasi/lauk tak terwakili) | Nyatakan transparan; rencanakan dataset kustom fase 2; model fokus Sayur & Buah |
| Ukuran model berat di browser | Kuantisasi uint8 + lazy-load + cache; pertimbangkan MobileNetV2 alpha=0.5 |
| Foto limbah tercampur/kotor menurunkan akurasi | Fine-tuning + augmentasi; uji lapangan; tampilkan confidence agar pengguna sadar ketidakpastian |
| Kamera butuh HTTPS | Firebase Hosting sudah HTTPS — aman |

---

## 7. URUTAN EKSEKUSI YANG DISARANKAN
1. **Fase 1–2** (latih + konversi) — di Colab, hasilkan folder `public/model/`. *(½–1 hari)*
2. **Fase 3 langkah 1–3** — modul `vision.js` + halaman Visi AI dengan upload & hasil. *(MVP demo)*
3. **Fase 3 langkah 4–5** — sambungkan ke donut komposisi + XAI top-3. *(fitur bermakna)*
4. **Fase 5** — uji, dokumentasi, klaim akurasi untuk laporan OPSI.
5. **Fase 4** — jalur ESP32-CAM (opsional, jika hardware siap).

---
> **Pembaruan v1.1 (14 Juni 2026):** Skema diperluas ke **4 kelas limbah organik MBG** — buah, sayur, daging, tulang. Fase 3 (frontend `vision.js` + halaman Visi AI) **sudah diimplementasikan & live**. Fase 1–2 dikemas jadi notebook 1-klik [`notebooks/jalari_vision_train.ipynb`](notebooks/jalari_vision_train.ipynb); dataset & instruksi di [DATASET_DAN_TRAINING_VISI_AI.md](DATASET_DAN_TRAINING_VISI_AI.md).

*Dokumen rencana — siap dieksekusi. Setelah disetujui, langkah berikutnya adalah membuat notebook pelatihan (Fase 1) atau langsung membangun `vision.js` bila model sudah tersedia.*

**Sumber:**
- [Notebook MobileNetV2 — nimapourmoradi (Kaggle)](https://www.kaggle.com/code/nimapourmoradi/fruits-and-vegetables-image-mobilenetv2)
- [Dataset Fruits & Vegetables — Kritik Seth](https://www.kaggle.com/datasets/kritikseth/fruit-and-vegetable-image-recognition)
- [jazzmacedo/fruits-and-vegetables-detector-36 (Hugging Face)](https://huggingface.co/jazzmacedo/fruits-and-vegetables-detector-36)
- [Improved MobileNetV2 for agricultural products (PMC)](https://pmc.ncbi.nlm.nih.gov/articles/PMC10859362/)
