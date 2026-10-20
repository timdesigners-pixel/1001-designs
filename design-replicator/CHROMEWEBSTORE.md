# Chrome Web Store — Design Replicator

Last Updated: 2026-10-20

## Store Listing

Extension Name: Design Replicator

Short Description: Sayfaları ve görselleri HTML/CSS/JS tasarımına dönüştürün. Binbir Dizayn kütüphanesi ve ücretli Pro uyarlama araçları.

Detailed Description: STORE-LISTING.md içindeki metin. Ücretsiz/ücretli ayrımı ve abonelik koşulları açıkça belirtilir.

Category: Developer Tools

Single Purpose: Sayfa ve görsel tasarımlarını düzenlenebilir çıktıya dönüştürmek ve bileşenleri mevcut belgelere uyarlamak.

Primary Language: Türkçe

## Graphics & Assets

| Asset | Dimensions | Status | Filename |
|---|---|---|---|
| Store Icon | 128×128 PNG | Var | icons/icon128.png |
| Screenshot 1 | 1280×800 | Gerçek eklentiden test görüntüsü hazır | store-assets/pro-library.png |
| Screenshot 2 | 1280×800 | Gerçek eklentiden test görüntüsü hazır | store-assets/pro-adapt.png |

Test ekranları kontrollü geliştirme verileriyle hazırlanır; canlı üyelik veya gerçek AI çıktısı gibi sunulmamalıdır.

## Permissions Justification

| Permission | Type | Justification |
|---|---|---|
| activeTab | permissions | Kullanıcı tıklamasıyla açık sayfa yakalama ve ekran görüntüsü |
| scripting | permissions | Kullanıcının seçtiği sayfadan DOM, stil ve renk bilgisi çıkarma |
| storage | permissions | Ayarlar, API bağlantıları, hesap oturumu ve kullanıcı bileşenleri |
| contextMenus | permissions | Görselden veya sayfadan tasarım başlatma kısayolu |
| unlimitedStorage | permissions | Kullanıcının kaydettiği HTML/CSS bileşenleri ve büyük yerel kütüphane |
| declarativeNetRequest | permissions | Yalnız localhost/127.0.0.1 modellerinin Origin uyumluluğu |
| all_urls | host_permissions | Kullanıcı isteğiyle kaynak sitelerden CSS/görsel/font indirme ve seçilen AI hizmetiyle iletişim |

Geniş site erişimi mevcut klonlama özelliğine aittir; mağaza incelemesinde gerekçe ve mümkünse izin azaltımı değerlendirilmelidir.

## Privacy & Data Use

Does the extension collect user data? Yes.

| Data Type | Collected? | Off-device? | Purpose | Third parties? |
|---|---|---|---|---|
| Personally identifiable info | E-posta | Evet | Hesap/abonelik | Ödeme sağlayıcısı |
| Health info | Özel olarak hayır | Sayfa içeriğinde varsa olabilir | Seçili sayfa işleme | AI sağlayıcısı |
| Financial info | Kart eklentide alınmaz; müşteri kimliği sunucuda | Evet | Abonelik | Stripe |
| Authentication info | Parola özeti, oturum, API anahtarı | Hesap hizmeti/API isteği | Yetkilendirme | İlgili hizmet |
| Personal communications | Özel olarak hayır | Seçili sayfada varsa olabilir | Kullanıcının seçtiği içerik | AI sağlayıcısı |
| Location | Özel olarak hayır | IP altyapı tarafından görülebilir | Bağlantı/hız sınırı | Hizmet altyapısı |
| Web history | Yalnız seçili sayfa URL ve başlık | AI modunda olabilir | Tasarım bağlamı | Seçili sağlayıcı |
| User activity | Aylık kullanım sayacı | Evet | Kota | Üyelik hizmeti |
| Website content | Seçili DOM, CSS, görsel | Kullanıcı başlatır/onaylar | Tasarım üretimi | AI sağlayıcısı |

- [x] Data is NOT sold to third parties
- [x] Data is NOT used for unrelated purposes
- [x] Data is NOT used for creditworthiness or lending

## Privacy Policy

Privacy Policy URL: HENÜZ YAYINLANMADI. pro/privacy.html taslağı işletmeci iletişim ve silme başvuru bilgileriyle tamamlanıp HTTPS üzerinde yayınlanmalı.

## Distribution

Visibility: Public hedefleniyor; henüz mağaza kaydı/gönderimi yapılmadı.

Regions: İşletmeci ve ödeme sağlayıcısının desteklediği bölgelere göre belirlenecek.

## Developer Info

Publisher Name: Kullanıcı tarafından verilecek.

Contact Email: Kullanıcı tarafından verilecek.

Support URL: İşletmeci tarafından belirlenecek.

Homepage: https://github.com/timdesigners-pixel/1001-designs

## Version History

| Version | Date | Changes | Status |
|---|---|---|---|
| 1.2.0 | 2026-10-20 | Pro Uyarla, hesap/ödeme hizmeti, ücretli özellik kapıları | Draft |
| 1.1.0 | 2026-10-20 | Yerel başlangıç sürümü GitHub'a kaydedildi | Source only |

## Review Notes

Canlı fiyat, üretim hizmeti ve alan adı, ödeme hesabı, gerçek ödeme/AI testleri ve mağaza geliştirici hesabı eksik. E-posta doğrulama, parola kurtarma ve hesap silme/destek süreci üretim öncesi tamamlanmalı.

Üretilen kod yalnız sandbox önizlemesinde çalışır; mağazanın uzaktan kod politikası açısından incelemede açıklanmalıdır. Kütüphane 1001 deterministik varyasyondur. Piksel kusursuzluğu garanti edilmez. Kaynak MIT lisansı korunur.
