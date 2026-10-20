# Değişiklik günlüğü

## 1.3.0 — 2026-10-20
- Gelişmiş editör araç çubuğu: IntelliSense, parametre yardımı, Bul/Değiştir, komutlar, hızlı düzeltme, geri al/yinele.
- HTML'deki öğe türlerini JavaScript IntelliSense'e aktaran yerel tür tanımları.
- CSS class/id ve değişken önerileri; `var()` içinde yinelenen ifade oluşturmayan tamamlama.
- Tıklanabilir hata/uyarı paneli, isteğe bağlı JavaScript tür denetimi ve kalıcı mini harita tercihi.
- Dosya başına imleç/kaydırma konumu, bağımsız model adresleri ve editör kapanışında kaynak temizliği.
- Gerçek MV3 ortamında çalışan editör ve dil worker testleri.

## 1.2.0 — 2026-10-20
- Binbir Dizayn kütüphanesine Pro rozetli Uyarla ve satın alma alanı.
- Hedef alan, yerleştirme, içerik yönü, veri gönderimi onayı, izole önizleme, uygulama ve geri alma.
- Hesap oluşturma/giriş/çıkış, Stripe Checkout ve abonelik yönetimi için yapılandırılabilir hizmet.
- Sunucuda ücretli abonelik doğrulaması, kota, imzalı webhook ve iptal desteği.
- AI üretim ve ZIP indirme için Pro kontrolü; hizmet testleri ve ticari kurulum taslakları.
- Gerçek ödeme/AI ve mağaza yayını işletmeci yapılandırması bekler.

## 1.1.0 — 2026-10-20
### Eklenenler
- **Emmet** (HTML ve CSS): öneri listesinde, `Tab` ve `Ctrl+E` ile kısaltma genişletme; etiket/öznitelik, `<script>` ve CSS dışı bağlamlarda tetiklenmez.
- **Yapay zekâ sağlayıcıları:** OpenAI ve Google Gemini eklendi (Claude, Ollama, LM Studio ile birlikte beş sağlayıcı). Model listesi ve bağlantı testi her biri için çalışır; sunucu adresi (proxy / uyumlu servis) değiştirilebilir.
- **1001 bileşenlik referans seti** (`dataset/components.json`): 42 kategori, 649'u etkileşimli JS içerir; her giriş kendi tasarım belirteçlerini (renk, yarıçap, gölge, yazı tipi, yoğunluk) taşır.
- **Referans seçimi (retrieval):** AI modlarında hedef tasarıma (kategori ipuçları, kelime örtüşmesi, palet yakınlığı) en yakın örnekler prompt'a eklenir; karakter bütçesi ve kategori başına üst sınır vardır.
- **Kütüphane sekmesi:** arama, kategori süzgeci, canlı küçük önizleme, editörde açma, referans olarak sabitleme.
- **Kullanıcı kütüphanesi:** sonucu "Referansa ekle" ile kaydet; `.json` / `.jsonl` içe aktar.
- **Eğitim / ince ayar verisi dışa aktarma:** OpenAI chat, Gemini (Vertex), Alpaca, ShareGPT (JSONL) ve örnekleri gömülü Ollama `Modelfile`.
- Koyu / açık / otomatik tema (stüdyo, açılır pencere, ayarlar, Monaco).

### Düzeltilenler
- Canlı CSS güncellemesi: `document.open()` window dinleyicilerini sildiği için önizleme mesajları ilk render'dan sonra kayboluyordu.
- Hatalı JS yazılırken önizleme artık çökmüyor.

## 1.0.0
- Sekme → birebir klon (DOM + CSSOM + görsel/font gömme, shadow DOM, canvas, form durumu)
- Pinterest pin / görsel URL → vision modeliyle HTML tasarım dökümü
- Sekme → AI ile yeniden yaz; görsel → renk paleti + pin sayfası
- Monaco editör (IntelliSense, canlı önizleme, hata rozetleri), ZIP / tek dosya çıktı
