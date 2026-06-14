# DATASET & TRAINING — VISI AI JALARI (Konteks Limbah Organik MBG)

Skema **4 kelas** klasifikasi limbah organik MBG: **buah · sayur · daging · tulang**.
Notebook 1-klik: [`notebooks/jalari_vision_train.ipynb`](notebooks/jalari_vision_train.ipynb)
[![Open In Colab](https://colab.research.google.com/assets/colab-badge.svg)](https://colab.research.google.com/github/Mostoples/jalari/blob/main/notebooks/jalari_vision_train.ipynb)

---

## 1. Dataset per kategori

| Kelas | Sumber | Akses | Catatan |
|-------|--------|-------|---------|
| **buah** | [Kritik Seth — Fruit & Vegetable (36 kelas)](https://www.kaggle.com/datasets/kritikseth/fruit-and-vegetable-image-recognition) | Kaggle API | 11 folder buah (apple, banana, grapes, kiwi, lemon, mango, orange, pear, pineapple, pomegranate, watermelon) → digabung jadi `buah` |
| **sayur** | sama (Kritik Seth) | Kaggle API | 25 folder sisanya → digabung jadi `sayur` |
| **daging** | [Meat Quality Assessment — crowww](https://www.kaggle.com/datasets/crowww/meat-quality-assessment-based-on-deep-learning) | Kaggle API | Semua gambar daging → `daging`. Alternatif: [Meat Freshness (vinayakshanawad)](https://www.kaggle.com/datasets/vinayakshanawad/meat-freshness-image-dataset), [Fresh & Rotten Poultry](https://www.kaggle.com/datasets/calvinsama/fresh-and-rotten-poultry-meat-datasets) |
| **tulang** | Foto mandiri tim (zip) **atau** [Roboflow Food Waste Detection — kelas Bone/Bone-fish](https://universe.roboflow.com/food-1b74y/food-waste-detection-jghxg) | Upload zip / Roboflow API | Paling langka. Foto mandiri 50–150 gambar paling autentik untuk MBG |

> **Catatan keterbatasan (untuk laporan, jujur):** dataset daging publik umumnya potret daging mentah, dan tulang paling baik dikumpulkan sendiri. Untuk akurasi lapangan MBG, lengkapi tiap kelas dengan foto nyata dari SPPG. Nasi/karbohidrat & sisa tercampur belum dicakup model v1.

---

## 2. Eksekusi ulang tiap fase RENCANA

| Fase | Status | Eksekusi |
|------|--------|----------|
| **1. Latih model** | ⚙️ Butuh GPU → **kamu** (Colab) | Notebook sel 1–8. ~10–20 menit di T4 gratis |
| **2. Konversi TF.js** | ⚙️ Di notebook yang sama | Notebook sel 9–12 → unduh `jalari_model.zip` |
| **3. Integrasi frontend** | ✅ **Selesai** (oleh asisten) | `public/js/vision.js` sudah skema 4-kelas (buah/sayur/daging/tulang), halaman Visi AI live |
| **4. ESP32-CAM** | 🔭 Lanjutan | Lihat [RENCANA_VISI_AI_JALARI.md](RENCANA_VISI_AI_JALARI.md) §4 |
| **5. Uji & dokumentasi** | 🟡 Sebagian | Dokumen ini + metrik dari sel evaluasi notebook |

---

## 3. Jalur tercepat untukmu (≈ 3 langkah)

1. Klik badge **Open in Colab** di atas → **Runtime → Run all**.
2. Upload `kaggle.json` saat diminta (Kaggle → Settings → Create New API Token).
3. *(Opsional, untuk kelas Tulang)* upload `tulang.zip` berisi foto tulang. Jika dilewati → model 3 kelas.

Hasil: `jalari_model.zip` terunduh otomatis. Ekstrak ke **`public/model/`** → `vision.js` langsung memakainya (drop-in, tanpa ubah kode) → `firebase deploy --only hosting`.

---

## 4. Kontrak kompatibilitas (dijaga otomatis oleh notebook)

- Input 224×224, preprocessing `[-1,1]` **di luar** model (frontend yang melakukannya).
- Konversi **`--input_format keras`** (agar `tf.loadLayersModel` berhasil) + `--quantize_uint8`.
- `labels.json` = **array** urut indeks, mis. `["buah","daging","sayur","tulang"]` — `vision.js` memetakan nama ini langsung ke kategori.
- Output ditaruh di `public/model/`: `model.json`, `group1-shard*.bin`, `labels.json`.
