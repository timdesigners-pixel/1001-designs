# 1001 bileşen referans seti

`components.json` — 1001 çalışan UI bileşeni (HTML + CSS + isteğe bağlı JS) ve tasarım belirteçleri.
`meta.json` — sürüm, sayılar, kategori ve palet listesi.

## Nasıl üretildi (dürüst not)
1001 bileşen tek tek elle çizilmedi. Set, `tools/build-dataset.mjs` ile **deterministik** olarak üretilir:

> 42 elle yazılmış bileşen kategorisi × 1-4 yerleşim varyantı × 14 renk paleti (10 açık, 4 koyu) × 7 köşe yarıçapı × 5 gölge × 4 yazı tipi × 3 yoğunluk

Aynı kategori içinde (yerleşim, palet, yarıçap, gölge, yazı tipi, yoğunluk) birleşimi asla tekrarlanmaz. Bu yüzden:
- Her giriş gerçekten farklı, çalışan bir tasarım ve farklı bir token kümesidir; ancak **yapısal çeşitlilik 42 kategori / 89 yerleşimle sınırlıdır**, 1001 bağımsız tasarım değildir.
- Küçük modellerde bağlam-içi örnek ve ince ayar için tutarlı, erişilebilir, dengeli veri sağlar; yaratıcı çeşitlilik için kendi bileşenlerinizi ekleyin (Ayarlar → Referans kütüphanesi → İçe aktar).

Doğrulama (`node tools/validate-dataset.mjs`): 1001 benzersiz kimlik/ad, hiçbir giriş birebir kopya değil, `undefined`/`NaN` sızıntısı yok, WCAG kontrastı (metin/arka plan ≥ 7, üzerinde-birincil ≥ 4.5, soluk metin ≥ 4.2). Chromium'da 1001 bileşenin tamamı render edilip 649 etkileşimli JS çalıştırılmış ve tıklanarak denenmiştir (hata, taşma, boş çıktı yok).

## Giriş şeması
```jsonc
{
  "id": "cmp-0001",
  "category": "button",            // 42 kategori
  "categoryTitle": "Button",
  "name": "Button · Solid · Rose · soft",
  "layout": "Solid",
  "tags": ["button", "cta", "rose", "light", "soft", "flat-shadow", "sans", "cozy"],
  "description": "Button (Solid): Filled primary ... Styled with the Rose light palette (primary #c2255c ...)",
  "tokens": { "palette": "Rose", "mode": "light", "colors": { "primary": "#c2255c", "onPrimary": "#fff", "bg": "...", "surface": "...", "text": "...", "muted": "...", "border": "...", "accent": "..." }, "radius": 8, "radiusName": "soft", "shadow": "flat", "font": "sans", "density": "cozy" },
  "interactive": true,
  "html": "<div class=\"c-button-01\">…</div>",   // kök sınıf benzersiz
  "css": ".c-button-01{--bg:…;--primary:…} …",     // belirteçler kök sınıf üzerinde CSS değişkeni
  "js": "(() => { const root = document.querySelector('.c-button-01'); … })();"
}
```
CSS tamamen kök sınıfa kapsamlıdır; aynı sayfada yüzlercesi çakışmadan bulunabilir. Renkler `--primary`, `--bg` gibi CSS değişkenleridir; bir bileşeni kendi markanıza uyarlamak için yalnızca kök sınıftaki değişkenleri değiştirmek yeterlidir.

## Kullanım yolları
| Yol | Sağlayıcılar | Nasıl |
|---|---|---|
| Bağlam-içi referans (RAG) | Claude, OpenAI, Gemini, Ollama, LM Studio | Stüdyo → "Referans kütüphanesini kullan" (varsayılan açık) |
| İnce ayar verisi | OpenAI (chat), Gemini / Vertex, yerel eğitim araçları | Ayarlar → Eğitim verisi dışa aktar (OpenAI, Gemini, Alpaca, ShareGPT) |
| Modele gömme | Ollama | Ayarlar → Ollama Modelfile (12 örnek gömülü) → `ollama create` |

Claude için herkese açık bir ince ayar yoktur; kütüphane yalnızca bağlam-içi referans olarak kullanılır.

Lisans: MIT.
