# 1.3.0 doğrulaması — 20 Ekim 2026

Editör testi: `node tools/test-editor.cjs`. Gerçek Chromium MV3 ortamında yerel Monaco dil worker'ları, HTMLInputElement tür çıkarımı, JavaScript semantik hataları, tür denetiminin açılıp kapanması, CSS değişken ve class tamamlaması, hata satırına gitme, bulma ve mini harita kontrolü doğrulandı.

## Önceki Pro akışı

- Sunucu testleri: 3 test grubu geçti. Oturum, kayıt/giriş/çıkış, abonelik, ödeme URL'sinin erişim açmaması, iptal, kota, başarısız AI çağrısında kota iadesi ve webhook imza/zaman kontrolleri.
- HTTP arayüz testi: ücretsiz kilit, 1001 bileşen/24 kart sayfalama, mobil taşma kontrolü, veri gönderimi onayı, önizleme, uygulama, geri alma geçti.
- Gerçek Chromium MV3 testi: eklenti ve service worker yüklendi; Monaco ve sandbox içindeki JavaScript butonu çalıştı; Pro kilidi, uyarlama, uygulama ve geri alma geçti.
- Paket kontrolü: manifest ve HTML dosya referansları, birinci taraf JavaScript söz dizimi ve 1001 bileşenli veri seti doğrulandı.
- Kaynak taraması gerçek anahtar bulmadı. Test dosyasındaki açık test parolaları elle incelendi ve yalnız bu sabitler taramadan hariç tutuldu.

Üyelik/Stripe ve AI yanıtları testlerde taklit edilmiştir. Gerçek hesapla ödeme, abonelik yenileme, gerçek AI çıktısının kalitesi ve Chrome Web Store incelemesi henüz doğrulanmadı. Mağaza görselleri test verileriyle gerçek eklenti arayüzünden alındı.

Testler için Node 24+, Python ve Playwright bulunan bir geliştirme ortamı gerekir. Playwright çalışma zamanı eklenti paketine dahil değildir.

Sunucu: `node --test server/server.test.mjs`

Arayüz: proje klasörünü 127.0.0.1:8790 üzerinden sunun; `node tools/test-ui.cjs`.

Gerçek eklenti: `node tools/test-extension.cjs`.

Dağıtım paketi: `python tools/release.py`.
