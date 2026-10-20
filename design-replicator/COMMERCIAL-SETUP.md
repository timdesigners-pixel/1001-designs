# Design Replicator Pro 1.2.0 — işletmeci kurulumu

Bu sürüm çalışan bir geliştirme paketidir. Canlı ödeme, gerçek AI modeli ve Chrome Web Store yayını henüz yapılmadı.

## Paket
Ücretsiz: statik sekme klonu, görsel paleti, 1001 bileşeni inceleme/açma/kopyalama, HTML indirme.
Ücretli Pro: AI üretim, ZIP dışa aktarma ve Binbir Dizayn → Uyarla.
Uyarla: seçili mevcut belge + bileşen + alan + içerik → AI → izole önizleme → açık Uygula → Geri al.
Kaynak site değiştirilmez. Kalıcı siteye entegrasyon, indirilen kodun kullanıcı tarafından siteye eklenmesidir.
AI yerleşimi her zaman doğru olmayabilir; çıktı gözden geçirilmelidir.

## Yerel hizmet (Node 24+; ek paket kurulumu yok)
1. server/.env.example dosyasını server/.env olarak kopyalayın.
2. ALLOWED_ORIGINS değerine chrome://extensions üzerindeki gerçek eklenti kimliğini chrome-extension://KIMLIK biçiminde girin.
3. Pro alanındaki hizmet adresini http://localhost:8787 olarak ayarlayın.
4. Proje klasöründe:
   node --env-file=server/.env server/server.mjs
5. Hesap oluşturun. Kayıt tek başına Pro vermez.
6. Stripe test hesabı, aylık recurring Price ID ve API anahtarlarını .env içinde yapılandırın.
7. Pro satın al → Stripe test ödeme → Pro alanında Üyeliği yenile.
8. Stripe portalını etkinleştirin; iptal/dönem sonu işlemlerini burada sınayın.
9. Testler: node --test server/server.test.mjs
10. Paket: python tools/release.py

Aylık uyarlama kotası MONTHLY_ADAPT_LIMIT ile belirlenir (varsayılan 50).
Uyarla hizmeti işletmecinin OpenAI/Claude API anahtarını kullanır; istekler için kota ayırır, başarısızlıkta iade eder.
Diğer AI modları kullanıcının Ayarlar'daki API anahtarı/yerel modeliyle çalışır; Pro doğrulaması çevrimiçi yapılır.
OpenAI varsayılan model adı gpt-4.1; Claude için geçerli model kimliğini CLAUDE_MODEL ile açıkça yapılandırın.
Gerçek modellerle doğrulama yapılmadan ticari kalite garantisi verilmemelidir.

## Ödeme güvenliği
- /v1/me ve /v1/adapt Stripe üzerinden güncel aboneliği getirir; yalnızca doğru fiyat, active durum ve dolmamış dönem kabul edilir.
- Checkout açılması veya başarı URL'sine gelinmesi erişim açmaz.
- Stripe müşteri kimliği yalnızca sunucuda oluşturulur; istemci kendi müşteri/fiyat bilgisini belirleyemez.
- /webhooks/stripe ham gövde, HMAC imza ve 5 dakika tolerans doğrular; tekrarlanan olaylar kayıtla tekilleştirilir. Erişim olay sırasına bağlı değildir.
- SQLite kalıcı disk üzerinde tutulmalı ve yedeklenmelidir. Tek sunucu için hazırlanmıştır; çoklu kopya için paylaşılan veri tabanı ve dağıtık hız sınırı gerekir.
- Parolalar scrypt ile özetlenir. Oturumlar 7 gün sürer, veri tabanında yalnızca özetleri saklanır.
- API, Stripe anahtarları ve veri tabanı eklenti ZIP'ine dahil edilmez.
- İstemci tarafındaki AI/ZIP kilidi değiştirilmiş bir eklentide aşılabilir. Ücretli Uyarla hizmetinin gerçek güvenlik sınırı sunucudaki abonelik doğrulamasıdır.
- Mevcut MIT lisansı eski ve açık kaynak kod için korunur; ücretli hizmet satmak kaynak kod üzerindeki MIT haklarını kaldırmaz.

## Üretim ve mağaza yayını öncesi gerekenler
- İşletmenin ülkesinde desteklenen ödeme hesabı, para birimi, vergiler ve aylık fiyat belirlenmeli. Stripe yalnızca desteklenen ülkedeki gerçek işletme hesabıyla kullanılabilir; başka sağlayıcı seçilirse sunucu uyarlanmalıdır.
- HTTPS alan adı ve kalıcı sunucu; NODE_ENV=production, PUBLIC_URL, ALLOWED_ORIGINS.
- Eklenti lib/pro.js içindeki varsayılan localhost adresini gerçek hizmet adresiyle değiştirin; mağaza paketi bu adresle yeniden üretilmeli.
- Stripe canlı fiyat/anahtar, API bakiyesi ve seçilen modeller; webhook ve portal kurulumu.
- E-posta doğrulama, parola kurtarma ve hesap silme/destek süreçleri üretim öncesi tamamlanmalı. Mevcut hesap ekranı geliştirme için e-posta/parola kullanır.
- İşletmeci adı, destek adresi, iade/iptal koşulları, kullanım kotası ve gizlilik metni tamamlanmalı. pro/privacy.html geliştirme taslağıdır; kamuya açık HTTPS sayfası yayınlanmalıdır.
- Gerçek ödeme/yenileme/iptal, gerçek AI ile uzun belge ve DOM yerleşimi testleri.
- Chrome geliştirici hesabı, mağaza açıklaması, ekran görüntüleri, gizlilik bağlantısı ve veri kullanım beyanları. STORE-LISTING.md taslağı sağlanır.
- <all_urls> mevcut klonlama ve harici varlık indirme için kullanılır; incelemede amacı açıkça beyan edin. İzinleri azaltmak için ayrı bir optional permissions geçişi değerlendirilmelidir.
- Mağazaya yalnızca release/design-replicator-1.2.0.zip yüklenir. Sunucu kaynak ZIP'i yüklenmez.
- Mağaza kaydı ve ödeme işlemi gerçek kullanıcı onayı/işletme bilgileriyle tamamlanmalıdır; bu geliştirme sırasında yayın yapılmamıştır.

## Sağlayıcı hesapları
ChatGPT abonelikleri ve API faturalaması ayrıdır:
https://help.openai.com/en/articles/9039756-managing-billing-for-chatgpt-and-the-api-platform
Claude, başkalarına sunulan ürünler için API anahtarı kullanımını belirtir:
https://support.claude.com/en/articles/13189465-log-in-to-your-claude-account
Bu sürüm sağlayıcıların oturum çerezlerini veya yerel masaüstü oturum anahtarlarını toplamaz.
Kendi ürün hesabı ile sağlayıcı API hesabı farklıdır. Desteklenen resmi bir ortak OAuth akışı olmadan abonelikle giriş varmış gibi gösterilmez.

Chrome ödeme politikası:
https://developer.chrome.com/docs/webstore/program-policies/accepting-payment
Stripe Checkout:
https://docs.stripe.com/api/checkout/sessions/create
