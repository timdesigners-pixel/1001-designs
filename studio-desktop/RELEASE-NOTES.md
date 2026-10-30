# Binbir Dizayn Stüdyo 0.1.0 — Windows (önizleme)

PL-010 · 1001 Designs ürününün ilk Windows uygulaması. Design Replicator'ın 1001 bileşenlik referans kütüphanesini çevrimdışı gezip deneyin, kodunu alın, tek dosya HTML olarak kaydedin. **İmzasız önizleme:** Windows SmartScreen "Bilinmeyen yayımcı" uyarısı verebilir ("Ek bilgi" → "Yine de çalıştır").

## Dosyalar
- `BinbirDizaynStudyo-0.1.0-Windows-x64.exe` — kurulum (kullanıcı başına, klasör seçilebilir)
- `BinbirDizaynStudyo-0.1.0-Windows-Portable-x64.exe` — kurulumsuz taşınabilir sürüm
- `SHA256SUMS-windows.txt` — doğrulama özetleri · `BUILD-INFO.txt` — derleme bilgisi (commit, ortam, testler)
- `windows-masaustu-*.png` — Windows runner'ında otomatik testte gerçek uygulama penceresinden alınan ekran görüntüleri

## Neler var
- 1001 bileşen · 42 kategori (Türkçe adlarıyla) · 14 palet; Türkçe duyarsız çok sözcüklü arama ve süzgeçler
- Canlı, etkileşimli önizleme (sandbox'lı); HTML/CSS/JS kodu ve kopyalama; tek dosya HTML olarak kaydetme
- Favoriler (yerel, kalıcı)
- Görselden renk paleti ve bu palete en yakın bileşenler (görsel cihazdan çıkmaz)
- Ctrl+K komut paleti

## Bilinen sınırlar
- Eklentinin AI modları, sekme klonlama, Pro uyarlama ve Monaco editörü masaüstünde yok (Chrome eklentisinde kalır).
- Ağ bağlantısı yok ve kullanılmaz; güncelleme denetimi yok.
- Doğrulama: birim testleri ve gerçek Electron penceresinde otomatik duman testi (Windows + Linux runner). Gerçek bir Windows masaüstünde elle test, DPI ve ekran okuyucu testleri yapılmadı. Planın "≥%80 düzenlenebilir çıktı" kabul ölçütü bu sürümde ölçülmedi.
