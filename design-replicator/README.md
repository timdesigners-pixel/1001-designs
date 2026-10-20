# Design Replicator (Chrome eklentisi, MV3) — v1.3.0

**Binbir Dizayn Pro:** Kütüphanedeki **Uyarla · PRO** düğmesi seçili bileşeni mevcut belgenin istediğiniz alanına uyarlamak için hedef alan, yerleştirme ve içerik seçimi sunar. Önizleme sonrasında sonucu uygulayabilir ve geri alabilirsiniz. Kaynak web sitesi değişmez; çıktı stüdyoda düzenlenir ve indirilir.

Ücretsiz araçlar: statik klon, palet, kütüphane, HTML indirme. Pro: Uyarla, AI üretim ve ZIP indirme. Pro hesabı ve satın alma kütüphanedeki Pro alanındadır. Hesap açmak Pro yetkisi vermez; ödeme sağlayıcısından aktif abonelik doğrulanır.

Ticari yayın henüz yapılmadı. Geliştirme paketi ve üyelik hizmeti için [COMMERCIAL-SETUP.md](COMMERCIAL-SETUP.md); mağaza durumu için [CHROMEWEBSTORE.md](CHROMEWEBSTORE.md). ChatGPT/Claude aylık üyelikleri API kredisi yerine kullanılamaz; üçüncü taraf bağlantısı API hesabıyla çalışır.

Pinterest pini, görsel ya da açık sekmedeki sayfayı **çalışan HTML/CSS/JS** tasarıma dönüştürür.
Çıktı: tek dosya `.html` (görsel/font gömülü) veya `index.html + style.css + script.js + assets/` ZIP.

## Kurulum (1 dakika)
Chrome mağaza dışı eklentileri sessizce kuramaz; "paketlenmemiş" kurulum şarttır.

1. Release ZIP'ini kalıcı bir klasöre çıkarın (eklenti bu klasörden çalışır)
2. `chrome://extensions` → sağ üstten **Geliştirici modu**'nu açın
3. **Paketlenmemiş öğe yükle** → çıkardığınız klasörü seçin
4. Araç çubuğunda simgeyi sabitleyin. Kısayol: `Alt+Shift+R`; sayfada ve görsellerde sağ tık menüsü de var

Windows'ta `install-helper.cmd` çift tıklanırsa `chrome://extensions` ve klasör otomatik açılır. Güncellemek için yeni ZIP'i aynı klasörün üstüne çıkarıp `chrome://extensions` → yenile düğmesine basın.

İlk kullanım: eklenti simgesi → Ayarlar → bir yapay zekâ sağlayıcısı seçin (yalnızca AI modları için; klon modu hesapsız çalışır).

## Modlar
| Mod | Model gerekir mi? | Ne üretir |
|---|---|---|
| **Pinterest pin / görsel URL → HTML tasarım** | Evet (vision) | Pin URL'sini, görsel adresini, açık Pinterest sekmesini ya da yüklenen/yapıştırılan görseli çözümler; tasarımın HTML/CSS/JS dökümünü editörde verir |
| Sekme → birebir klon | Hayır | Canlı DOM + CSSOM (media query, hover, @font-face) + görsel/font gömme |
| Sekme → AI ile yeniden yaz | Evet | Ekran görüntüsü + ölçülmüş token'lar → temiz, çalışan kod |
| Görsel → renk paleti + pin sayfası | Hayır | Palet çıkarır; tasarımı çözümlemez |

**Pin URL akışı:** URL → `og:image` (Pinterest için `originals` çözünürlüğü) → görsel → pin başlığı/açıklaması bağlam → referans bileşenler → vision modeli → HTML.

## Yapay zekâ sağlayıcıları (Ayarlar)
| Sağlayıcı | Varsayılan adres | Not |
|---|---|---|
| Claude | api.anthropic.com | `claude-sonnet-5-5` önerilir |
| OpenAI | api.openai.com | vision destekli model (ör. `gpt-4.1`); OpenAI uyumlu servisler için adres değiştirilebilir |
| Gemini | generativelanguage.googleapis.com | `gemini-2.5-flash` / `gemini-2.5-pro` |
| Ollama (yerel) | localhost:11434 | vision: `ollama pull qwen2.5vl:7b`; `OLLAMA_ORIGINS` gerekmez |
| LM Studio (yerel) | localhost:1234 | Developer → Start Server |

"Bağlantıyı test et" her sağlayıcının model listesini getirir. Yerel modeller büyük çıktıda Claude/OpenAI/Gemini'nin gerisinde kalabilir; `num_ctx`, maks. token ve referans bütçesini ayarlayın.

## Gelişmiş kod editörü (Monaco) + IntelliSense + Emmet
- CSS: HTML belgesindeki class/id önerileri, CSS özellik ve değerleri, renk seçici, değişken değerleri ve doğru `var(--token)` tamamlaması.
- JavaScript: HTML öğelerine göre tür önerileri (`input.value`, `button.disabled`), imza/parametre yardımı ve açılıp kapatılabilir tür denetimi.
- Tıklanabilir **Sorunlar** paneli: HTML/CSS/JS hata ve uyarılarını listeler, seçilen satıra götürür (`Ctrl+Shift+M`).
- Araç çubuğu: IntelliSense, parametreler, Bul/Değiştir, komut paleti, hızlı düzeltme, Geri al/Yinele; mini harita ve tür denetimi tercihleri kaydedilir.
- Dosya geçişlerinde imleç, kaydırma konumu ve geri alma geçmişi korunur.

### Önceki düzenleme araçları
- IntelliSense: HTML etiket/öznitelik, CSS özellik/değer (MDN açıklamalı), JS için tür tabanlı DOM/ES2020, hover, imza ipuçları, renk seçici
- **Emmet** (HTML + CSS): `ul>li.item$*3` yaz → `Tab` ya da `Ctrl+E`; öneri listesinde "Emmet" öğesi görünür. CSS'te `m10-20`, `bgc#f00`, `dn`…
- Projeye özel öneri: CSS'teki `--değişkenler` → `var(--x)`; `querySelector('` içinde `.class`/`#id`; snippet'ler (`flexc`, `mq`, `qsa`, `on`, `fetchj`…)
- Hata rozetleri, canlı önizleme (yalnız CSS değişince yeniden yüklemeden), `Ctrl+Enter` uygula, `Shift+Alt+F` biçimlendir, `Alt+Z` satır kaydır
- Koyu / açık / otomatik tema (üstteki düğme)

## 1001 bileşenlik referans seti
`dataset/` içinde 42 kategori, 89 yerleşim, 14 palet; 649'u etkileşimli JS içerir. **Dürüst not:** elle yazılmış bileşen şablonlarının deterministik varyasyonlarıdır (token kombinasyonları), 1001 bağımsız tasarım değildir. Ayrıntı: [dataset/README.md](dataset/README.md).

- **Bağlam-içi referans (tüm sağlayıcılar):** AI modlarında hedef tasarıma en yakın 4 örnek (kategori ipuçları + kelime örtüşmesi + palet yakınlığı) prompt'a eklenir. Stüdyoda kapatılabilir.
- **Kütüphane sekmesi:** arama, kategori, canlı küçük önizleme, editörde açma, **sabitleme** (her istekte kullan)
- **Kendi bileşenlerin:** sonucu "Referansa ekle"; `.json/.jsonl` içe aktar
- **Eğitim / ince ayar verisi:** Ayarlar → dışa aktar: OpenAI chat JSONL, Gemini/Vertex JSONL, Alpaca, ShareGPT, Ollama `Modelfile` (12 örnek gömülü). Claude için herkese açık ince ayar yoktur; yalnızca bağlam-içi kullanılır.

## Dürüst sınırlar
- "Birebir klon" **statiktir**: sayfanın o anki hâlini script'siz dondurur. Menü/sekme/akordeon gibi ARIA davranışları için küçük bir etkileşim paketi eklenir; gerçek uygulama mantığı için AI modunu veya "script'leri koru"yu kullanın.
- Görselden "birebir" yeniden çizim vision modelinin yeteneğine bağlıdır; piksel-kusursuzluk garanti edilmez. Pinterest veri yapısını değiştirirse bazı alanlar boş kalabilir.
- OpenAI, Gemini, Claude ve Ollama akışları sahte sunucularla test edildi; gerçek hesap/modelle uçtan uca denenmedi.
- `<all_urls>` izni çapraz-kaynak CSS/görsel/font indirmek için gerekli. API anahtarları `chrome.storage.local` içinde düz metin tutulur.
- Yalnızca kendi tasarımlarınızı veya kopyalama hakkınız olan içerikleri klonlayın.

## Geliştirme
```
manifest.json  background.js          # bağlam menüsü, iş başlatma, ekran görüntüsü, Origin kuralı
popup/ options/ studio/ sandbox/      # arayüz; sandbox = CSP'siz önizleme sayfası
content/page-extract.js               # sayfa içi çıkarıcı
lib/    ai.js refs.js editor.js theme.js settings.js zip.js palette.js util.js
templates/  pin.* clone-interactions.js
dataset/    components.json meta.json README.md
vendor/     monaco/ emmet/            # yerel paketli (MV3 uzaktan script yüklemez)
tools/      build-dataset.mjs validate-dataset.mjs release.py make-icons.js
```
```bash
node tools/build-dataset.mjs && node tools/validate-dataset.mjs   # seti yeniden üret + doğrula
python tools/release.py                                           # release/ klasörüne paket üret
```
Lisans: MIT (üçüncü taraf: Monaco, emmet — MIT).
